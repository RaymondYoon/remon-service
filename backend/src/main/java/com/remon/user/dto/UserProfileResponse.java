package com.remon.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String nickname;
    private long followerCount;
    private long followingCount;
    private boolean following;
}
