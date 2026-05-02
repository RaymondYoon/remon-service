package com.remon.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NicknameRequest {

    @NotBlank
    @Size(max = 20, message = "닉네임은 최대 20자까지 가능합니다.")
    private String nickname;
}
