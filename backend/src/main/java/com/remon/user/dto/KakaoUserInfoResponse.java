package com.remon.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class KakaoUserInfoResponse {

    private Long id;

    @JsonProperty("kakao_account")
    private KakaoAccount kakaoAccount;

    @JsonProperty("properties")
    private KakaoProperties properties;

    public String getEmail() {
        return kakaoAccount != null ? kakaoAccount.getEmail() : null;
    }

    public String getNickname() {
        return properties != null ? properties.getNickname() : null;
    }

    @Getter
    @NoArgsConstructor
    public static class KakaoAccount {
        private String email;
    }

    @Getter
    @NoArgsConstructor
    public static class KakaoProperties {
        private String nickname;
    }
}
