package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.entity.RefreshToken;
import com.remon.user.entity.User;
import com.remon.user.service.KakaoAuthService;
import com.remon.user.service.OAuthCodeService;
import com.remon.user.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class KakaoAuthController {

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final OAuthCodeService oAuthCodeService;

    @Value("${frontend.oauth-callback-url}")
    private String frontendOAuthCallbackUrl;

    public KakaoAuthController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider,
                               RefreshTokenService refreshTokenService, OAuthCodeService oAuthCodeService) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.oAuthCodeService = oAuthCodeService;
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
     * → 인가 코드로 JWT 발급 후 단기 코드 생성 → 프론트엔드 /oauth-callback 으로 redirect
     */
    @GetMapping("/kakao/callback")
    public void kakaoCallback(
            @RequestParam String code,
            HttpServletResponse response
    ) throws IOException {
        User user = kakaoAuthService.processKakaoLogin(code);
        String accessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getEmail());

        String shortCode = oAuthCodeService.generateCode(user.getEmail(), accessToken, refreshToken.getToken());

        String nickname = URLEncoder.encode(
                user.getNickname() != null ? user.getNickname() : "", StandardCharsets.UTF_8);
        String email = URLEncoder.encode(
                user.getEmail() != null ? user.getEmail() : "", StandardCharsets.UTF_8);

        String redirectUrl = frontendOAuthCallbackUrl
                + "?code=" + shortCode
                + "&nickname=" + nickname
                + "&email=" + email;

        response.sendRedirect(redirectUrl);
    }

    /**
     * 단기 코드 → accessToken + refreshToken 교환
     * POST /api/auth/code-exchange
     * Request Body: { "code": "uuid" }
     * Response: { "accessToken": "...", "refreshToken": "...", "email": "..." }
     */
    @PostMapping("/code-exchange")
    public ResponseEntity<?> codeExchange(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "코드가 필요합니다."));
        }
        try {
            Map<String, String> tokens = oAuthCodeService.exchangeCode(code);
            return ResponseEntity.ok(tokens);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
