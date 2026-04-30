package com.remon.follow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class FollowUserResponse {
    private Long userId;
    private String nickname;
    private boolean following;
}
