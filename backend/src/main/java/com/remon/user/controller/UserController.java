package com.remon.user.controller;

import com.remon.follow.repository.FollowRepository;
import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginRequest;
import com.remon.user.dto.LoginResponse;
import com.remon.user.dto.UserProfileResponse;
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
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final FollowRepository followRepository;

    public UserController(UserService userService, JwtTokenProvider jwtTokenProvider,
                          RefreshTokenService refreshTokenService, FollowRepository followRepository) {
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.followRepository = followRepository;
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

    @GetMapping("/{userId}/profile")
    public UserProfileResponse getUserProfile(@PathVariable Long userId,
                                              Authentication authentication) {
        User target = userService.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다. id=" + userId));
        long followerCount = followRepository.countByFollowingId(userId);
        long followingCount = followRepository.countByFollowerId(userId);
        boolean isFollowing = false;
        if (authentication != null) {
            isFollowing = userService.findByEmail(authentication.getName())
                    .map(me -> followRepository.existsByFollowerIdAndFollowingId(me.getId(), userId))
                    .orElse(false);
        }
        return UserProfileResponse.builder()
                .id(target.getId())
                .nickname(target.getNickname())
                .followerCount(followerCount)
                .followingCount(followingCount)
                .following(isFollowing)
                .build();
    }
}
