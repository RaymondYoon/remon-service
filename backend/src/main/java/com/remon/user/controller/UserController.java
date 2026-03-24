package com.remon.user.controller;

import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginRequest;
import com.remon.user.dto.LoginResponse;
import com.remon.user.dto.UserRequest;
import com.remon.user.dto.UserResponse;
import com.remon.user.entity.User;
import com.remon.user.service.UserService;
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

    public UserController(UserService userService, JwtTokenProvider jwtTokenProvider) {
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/register")
    public UserResponse register(@RequestBody UserRequest request) {
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
    public LoginResponse login(@RequestBody LoginRequest request) {
        User user = userService.login(request.getEmail(), request.getPassword());
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return LoginResponse.builder()
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole().name())
                .token(token)
                .build();
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
        userService.deleteAccount(authentication.getName());
    }
}
