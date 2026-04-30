package com.remon.follow.service;

import com.remon.follow.dto.FollowUserResponse;
import com.remon.follow.entity.Follow;
import com.remon.follow.repository.FollowRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@Transactional
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    public FollowService(FollowRepository followRepository, UserRepository userRepository) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
    }

    public void follow(String followerEmail, Long targetUserId) {
        User follower = userRepository.findByEmail(followerEmail)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        if (follower.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("자기 자신을 팔로우할 수 없습니다.");
        }
        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NoSuchElementException("대상 사용자를 찾을 수 없습니다. id=" + targetUserId));
        if (followRepository.existsByFollowerIdAndFollowingId(follower.getId(), targetUserId)) {
            throw new IllegalStateException("이미 팔로우 중입니다.");
        }
        followRepository.save(Follow.builder().follower(follower).following(following).build());
    }

    public void unfollow(String followerEmail, Long targetUserId) {
        User follower = userRepository.findByEmail(followerEmail)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        if (!followRepository.existsByFollowerIdAndFollowingId(follower.getId(), targetUserId)) {
            throw new IllegalStateException("팔로우 중이 아닙니다.");
        }
        followRepository.deleteByFollowerIdAndFollowingId(follower.getId(), targetUserId);
    }

    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowers(Long userId, Long currentUserId) {
        return followRepository.findByFollowingId(userId).stream()
                .map(f -> {
                    User u = f.getFollower();
                    boolean isFollowing = currentUserId != null &&
                            followRepository.existsByFollowerIdAndFollowingId(currentUserId, u.getId());
                    return FollowUserResponse.builder()
                            .userId(u.getId())
                            .nickname(u.getNickname())
                            .following(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowing(Long userId, Long currentUserId) {
        return followRepository.findByFollowerId(userId).stream()
                .map(f -> {
                    User u = f.getFollowing();
                    boolean isFollowing = currentUserId != null &&
                            followRepository.existsByFollowerIdAndFollowingId(currentUserId, u.getId());
                    return FollowUserResponse.builder()
                            .userId(u.getId())
                            .nickname(u.getNickname())
                            .following(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
