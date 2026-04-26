package com.remon.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP 기준 Rate Limiting 필터
 *  - /api/auth/**  : 1분에 10회
 *  - 그 외 전체    : 1분에 60회
 * 초과 시 429 Too Many Requests 반환
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final int AUTH_LIMIT    = 10;
    private static final int GENERAL_LIMIT = 60;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    // IP별 버킷 저장소 (auth / general 각각 분리)
    private final ConcurrentHashMap<String, Bucket> authBuckets    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String ip   = extractClientIp(request);
        String path = request.getRequestURI();

        Bucket bucket = isAuthPath(path)
                ? authBuckets.computeIfAbsent(ip, k -> buildBucket(AUTH_LIMIT))
                : generalBuckets.computeIfAbsent(ip, k -> buildBucket(GENERAL_LIMIT));

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
     * 역방향 프록시(Railway, Vercel 등) 뒤에서도 실제 클라이언트 IP를 추출
     */
    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
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
