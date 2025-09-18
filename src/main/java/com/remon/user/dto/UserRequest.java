package com.remon.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserRequest {
    private String email;
    private String password;
    private String provider;
    private String providerId;
    private String nickname;
}
