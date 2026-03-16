package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.entity.User;
import com.remon.user.service.KakaoAuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
public class KakaoAuthController {

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${frontend.oauth-callback-url}")
    private String frontendOAuthCallbackUrl;

    public KakaoAuthController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 카카오 로그인 진입점
     * GET /api/auth/kakao
     * → 카카오 인증 페이지로 브라우저 redirect
     */
    @GetMapping("/kakao")
    public void kakaoLogin(HttpServletResponse response) throws IOException {
        String authorizationUrl = kakaoAuthService.getAuthorizationUrl();
        response.sendRedirect(authorizationUrl);
    }

    /**
     * 카카오 로그인 콜백
     * GET /api/auth/kakao/callback?code=AUTHORIZATION_CODE
     * → 인가 코드로 JWT 발급 후 프론트엔드 /oauth-callback 으로 redirect
     */
    @GetMapping("/kakao/callback")
    public void kakaoCallback(
            @RequestParam String code,
            HttpServletResponse response
    ) throws IOException {
        User user = kakaoAuthService.processKakaoLogin(code);
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());

        String nickname = URLEncoder.encode(
                user.getNickname() != null ? user.getNickname() : "", StandardCharsets.UTF_8);
        String email = URLEncoder.encode(
                user.getEmail() != null ? user.getEmail() : "", StandardCharsets.UTF_8);

        String redirectUrl = frontendOAuthCallbackUrl
                + "?token=" + token
                + "&nickname=" + nickname
                + "&email=" + email;

        response.sendRedirect(redirectUrl);
    }
}
