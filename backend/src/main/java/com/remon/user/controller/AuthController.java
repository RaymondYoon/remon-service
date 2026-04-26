package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.RefreshRequest;
import com.remon.user.entity.RefreshToken;
import com.remon.user.entity.User;
import com.remon.user.service.RefreshTokenService;
import com.remon.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;

    public AuthController(RefreshTokenService refreshTokenService,
                          JwtTokenProvider jwtTokenProvider,
                          UserService userService) {
        this.refreshTokenService = refreshTokenService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userService = userService;
    }

    /**
     * Access Token 재발급
     * POST /api/auth/refresh
     * Body: { "refreshToken": "..." }
     * Response: { "accessToken": "..." }
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@RequestBody RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenService.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new IllegalStateException("유효하지 않은 Refresh Token입니다."));

        if (refreshTokenService.isExpired(refreshToken)) {
            refreshTokenService.deleteByEmail(refreshToken.getEmail());
            throw new IllegalStateException("만료된 Refresh Token입니다. 다시 로그인해주세요.");
        }

        User user = userService.findByEmail(refreshToken.getEmail())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        String newAccessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }
}
