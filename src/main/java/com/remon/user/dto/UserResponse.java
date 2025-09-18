package com.remon.user.dto;

import com.remon.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String nickname;
    private Role role;
    private boolean emailVerified;
}
