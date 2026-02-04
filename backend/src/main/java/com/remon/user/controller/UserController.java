package com.remon.user.controller;

import com.remon.user.dto.LoginRequest;
import com.remon.user.dto.LoginResponse;
import com.remon.user.dto.UserRequest;
import com.remon.user.dto.UserResponse;
import com.remon.user.entity.User;
import com.remon.user.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService){
        this.userService = userService;
    }

    @PostMapping("/register")
    public UserResponse register(@RequestBody UserRequest request){
        User user =  userService.registerUser(
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
    public LoginResponse login (@RequestBody LoginRequest request){
        User user = userService.login(request.getEmail(), request.getPassword());
        return LoginResponse.builder()
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole().name())
                .build();
    }

    @GetMapping("/{email}")
    public Optional<User> getUserByEmail(@PathVariable String email){
        return userService.findByEmail(email);
    }

    @GetMapping
    public List<User> getAllUsers(){
        return userService.findAll();
    }
}
