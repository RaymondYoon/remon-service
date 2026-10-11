package com.remon.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * IP 기준 Rate Limiting 필터
 *  - /api/auth/**  : 1분에 10회
 *  - 그 외 전체    : 1분에 60회
 * 초과 시 429 Too Many Requests 반환
 *
 * IP별 버킷은 일정 시간 요청이 없으면 만료되는 Caffeine 캐시에 보관한다
 * (기존 ConcurrentHashMap 은 비워지지 않아 IP 수만큼 메모리가 계속 늘어났음).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final int AUTH_LIMIT    = 10;
    private static final int GENERAL_LIMIT = 60;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    // 버킷은 1분이면 가득 차므로, 10분간 요청이 없는 IP의 버킷은 버려도 동작이 같다
    private static final Duration BUCKET_IDLE_EXPIRY = Duration.ofMinutes(10);
    private static final long MAX_TRACKED_IPS = 100_000;

    private final Cache<String, Bucket> authBuckets    = newBucketCache();
    private final Cache<String, Bucket> generalBuckets = newBucketCache();

    /**
     * 앞단 신뢰 프록시 수 (Railway 엣지 프록시 1개).
     * X-Forwarded-For 의 맨 왼쪽 값은 클라이언트가 임의로 넣을 수 있으므로,
     * 신뢰 프록시가 마지막에 추가한 값(오른쪽에서 trustedProxyHops 번째)을 클라이언트 IP로 쓴다.
     */
    private final int trustedProxyHops;

    public RateLimitFilter(@Value("${ratelimit.trusted-proxy-hops:1}") int trustedProxyHops) {
        this.trustedProxyHops = trustedProxyHops;
    }

    private static Cache<String, Bucket> newBucketCache() {
        return Caffeine.newBuilder()
                .expireAfterAccess(BUCKET_IDLE_EXPIRY)
                .maximumSize(MAX_TRACKED_IPS)
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String ip   = extractClientIp(request);
        String path = request.getRequestURI();

        Bucket bucket = isAuthPath(path)
                ? authBuckets.get(ip, k -> buildBucket(AUTH_LIMIT))
                : generalBuckets.get(ip, k -> buildBucket(GENERAL_LIMIT));

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            int limit = isAuthPath(path) ? AUTH_LIMIT : GENERAL_LIMIT;
            log.warn("Rate limit 초과 - IP: {}, path: {}, limit: {}/min", ip, path, limit);
            writeTooManyRequests(response, limit);
        }
    }

    private boolean isAuthPath(String path) {
        return path.startsWith("/api/auth/");
    }

    /**
     * 고정 윈도우 버킷: capacity개 토큰, 1분마다 capacity개로 완전 보충
     */
    private Bucket buildBucket(int capacity) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, REFILL_DURATION)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * 역방향 프록시(Railway) 뒤에서 실제 클라이언트 IP 추출.
     * X-Forwarded-For: "<위조 가능한 값들>, <클라이언트 IP>" 형태에서 신뢰 프록시가 붙인 값만 사용한다.
     */
    String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (trustedProxyHops > 0 && forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            int index = Math.max(0, hops.length - trustedProxyHops);
            String candidate = hops[index].trim();
            if (!candidate.isEmpty()) {
                return candidate;
            }
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response, int limit) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"error\":\"요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.\","
                + "\"limit\":" + limit + ","
                + "\"window\":\"1분\"}"
        );
    }
}
