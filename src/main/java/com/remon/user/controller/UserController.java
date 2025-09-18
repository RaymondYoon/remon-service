package com.remon.User.controller;

import com.remon.User.entity.User;
import com.remon.User.service.UserService;
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
    public User register(@RequestBody User userRequest){
        return userService.registerUser(
                userRequest.getEmail(),
                userRequest.getPassword(),
                userRequest.getProvider(),
                userRequest.getProviderId(),
                userRequest.getNickname()
        );
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
