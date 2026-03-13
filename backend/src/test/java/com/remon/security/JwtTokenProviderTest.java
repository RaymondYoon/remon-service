package com.remon.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Encoders;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private String secret; // expired token 테스트에서 동일 시크릿 재사용
    private static final long EXPIRATION = 3_600_000L; // 1시간

    @BeforeEach
    void setUp() {
        // JJWT가 HS256에 적합한 256-bit 키를 자동으로 생성
        SecretKey key = Jwts.SIG.HS256.key().build();
        this.secret = Encoders.BASE64.encode(key.getEncoded());
        jwtTokenProvider = new JwtTokenProvider(secret, EXPIRATION);
    }

    @Test
    @DisplayName("토큰 생성 - 비어있지 않은 문자열 반환")
    void generateToken_shouldReturnNonEmptyString() {
        String token = jwtTokenProvider.generateToken("user@test.com", "USER");
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("유효한 토큰 검증 - true 반환")
    void validateToken_withValidToken_shouldReturnTrue() {
        String token = jwtTokenProvider.generateToken("user@test.com", "USER");
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("잘못된 토큰 검증 - false 반환")
    void validateToken_withInvalidToken_shouldReturnFalse() {
        assertThat(jwtTokenProvider.validateToken("this.is.invalid")).isFalse();
    }

    @Test
    @DisplayName("빈 문자열 토큰 검증 - false 반환")
    void validateToken_withEmptyToken_shouldReturnFalse() {
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 검증 - false 반환")
    void validateToken_withExpiredToken_shouldReturnFalse() {
        // 같은 시크릿으로 만료 시간을 -1(이미 만료)로 설정
        JwtTokenProvider shortLived = new JwtTokenProvider(secret, -1L);
        String expiredToken = shortLived.generateToken("user@test.com", "USER");
        // 시그니처는 유효하지만 만료된 토큰 → false
        assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
    }

    @Test
    @DisplayName("토큰에서 이메일 추출")
    void getEmail_shouldReturnCorrectEmail() {
        String email = "user@test.com";
        String token = jwtTokenProvider.generateToken(email, "USER");
        assertThat(jwtTokenProvider.getEmail(token)).isEqualTo(email);
    }

    @Test
    @DisplayName("토큰에서 역할 추출")
    void getRole_shouldReturnCorrectRole() {
        String token = jwtTokenProvider.generateToken("admin@test.com", "ADMIN");
        assertThat(jwtTokenProvider.getRole(token)).isEqualTo("ADMIN");
    }
}
