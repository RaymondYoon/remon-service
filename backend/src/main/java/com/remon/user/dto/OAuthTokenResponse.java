package com.remon.user.dto;

public record OAuthTokenResponse(String accessToken, String refreshToken, String email) {
}
