package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginResponse;
import com.remon.user.entity.User;
import com.remon.user.service.KakaoAuthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class KakaoAuthController {

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;

    public KakaoAuthController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 카카오 로그인 콜백
     * 프론트엔드에서 카카오 인가 코드를 받아 이 엔드포인트로 전달
     * GET /api/auth/kakao/callback?code=AUTHORIZATION_CODE
     */
    @GetMapping("/kakao/callback")
    public LoginResponse kakaoCallback(@RequestParam String code) {
        User user = kakaoAuthService.processKakaoLogin(code);
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return LoginResponse.builder()
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole().name())
                .token(token)
                .build();
    }
}
