package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginRequest;
import com.remon.user.dto.LoginResponse;
import com.remon.user.dto.UserRequest;
import com.remon.user.dto.UserResponse;
import com.remon.user.entity.RefreshToken;
import com.remon.user.entity.User;
import com.remon.user.service.RefreshTokenService;
import com.remon.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    public UserController(UserService userService, JwtTokenProvider jwtTokenProvider,
                          RefreshTokenService refreshTokenService) {
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/register")
    public UserResponse register(@Valid @RequestBody UserRequest request) {
        User user = userService.registerUser(
                request.getEmail(),
                request.getPassword(),
                request.getProvider(),
                request.getProviderId(),
                request.getNickname()
        );
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole())
                .emailVerified(user.isEmailVerified())
                .build();
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        User user = userService.login(request.getEmail(), request.getPassword());
        String accessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getEmail());
        return LoginResponse.builder()
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole().name())
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .build();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication) {
        refreshTokenService.deleteByEmail(authentication.getName());
    }

    @GetMapping("/{email}")
    public Optional<User> getUserByEmail(@PathVariable String email) {
        return userService.findByEmail(email);
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(Authentication authentication) {
        String email = authentication.getName();
        refreshTokenService.deleteByEmail(email);
        userService.deleteAccount(email);
    }
}
