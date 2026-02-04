package com.remon.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private String email;
    private String nickname;
    private String role;
}
