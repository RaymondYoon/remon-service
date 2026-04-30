package com.remon.config;

import com.remon.ratelimit.RateLimitFilter;
import com.remon.security.JwtAuthenticationFilter;
import com.remon.security.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final RateLimitFilter rateLimitFilter;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider, RateLimitFilter rateLimitFilter) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 인증 없이 접근 허용
                        .requestMatchers("/api/users/register", "/api/users/login").permitAll()
                        // 카카오 OAuth 진입점 + 콜백
                        .requestMatchers("/api/auth/kakao", "/api/auth/kakao/**").permitAll()
                        // Refresh Token으로 Access Token 재발급 (인증 불필요)
                        .requestMatchers("/api/auth/refresh").permitAll()
                        // Actuator health check
                        .requestMatchers("/actuator/health").permitAll()
                        // Swagger UI
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        // 공개 책 둘러보기 (비로그인 허용)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/books/explore").permitAll()
                        // 리뷰 목록 조회 (비로그인 허용)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/books/*/reviews").permitAll()
                        // 유저 프로필 조회 (비로그인 허용)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/*/profile").permitAll()
                        // 팔로워·팔로잉 목록 조회 (비로그인 허용)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/follow/*/followers").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/follow/*/following").permitAll()
                        // 그 외 모든 요청은 JWT 인증 필요
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // allowedOriginPatterns 사용 (allowCredentials=true 시 "*" 대신 필요)
        config.setAllowedOrigins(List.of("https://remon-service.vercel.app"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
