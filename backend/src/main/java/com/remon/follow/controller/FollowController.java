package com.remon.follow.controller;

import com.remon.follow.dto.FollowUserResponse;
import com.remon.follow.repository.FollowRepository;
import com.remon.follow.service.FollowService;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class FollowController {

    private final FollowService followService;
    private final UserRepository userRepository;
    private final FollowRepository followRepository;

    public FollowController(FollowService followService, UserRepository userRepository,
                            FollowRepository followRepository) {
        this.followService = followService;
        this.userRepository = userRepository;
        this.followRepository = followRepository;
    }

    @PostMapping("/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void follow(@PathVariable Long userId, Authentication authentication) {
        followService.follow(authentication.getName(), userId);
    }

    @DeleteMapping("/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(@PathVariable Long userId, Authentication authentication) {
        followService.unfollow(authentication.getName(), userId);
    }

    @GetMapping("/{userId}/followers")
    public List<FollowUserResponse> getFollowers(@PathVariable Long userId,
                                                  Authentication authentication) {
        Long currentUserId = resolveCurrentUserId(authentication);
        return followService.getFollowers(userId, currentUserId);
    }

    @GetMapping("/{userId}/following")
    public List<FollowUserResponse> getFollowing(@PathVariable Long userId,
                                                  Authentication authentication) {
        Long currentUserId = resolveCurrentUserId(authentication);
        return followService.getFollowing(userId, currentUserId);
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        if (authentication == null) return null;
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
