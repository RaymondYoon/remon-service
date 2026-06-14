package com.remon.user.service;

import com.remon.user.entity.OAuthCode;
import com.remon.user.repository.OAuthCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class OAuthCodeService {

    private final OAuthCodeRepository oAuthCodeRepository;

    public OAuthCodeService(OAuthCodeRepository oAuthCodeRepository) {
        this.oAuthCodeRepository = oAuthCodeRepository;
    }

    public String generateCode(String email, String accessToken, String refreshToken) {
        oAuthCodeRepository.deleteByEmail(email);
        String code = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        OAuthCode oAuthCode = OAuthCode.builder()
                .code(code)
                .email(email)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .createdAt(now)
                .expiresAt(now.plusSeconds(30))
                .build();
        oAuthCodeRepository.save(oAuthCode);
        return code;
    }

    public Map<String, String> exchangeCode(String code) {
        OAuthCode oAuthCode = oAuthCodeRepository.findByCode(code)
                .orElseThrow(() -> new IllegalStateException("유효하지 않은 코드입니다."));

        if (oAuthCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            oAuthCodeRepository.delete(oAuthCode);
            throw new IllegalStateException("유효하지 않은 코드입니다.");
        }

        String accessToken = oAuthCode.getAccessToken();
        String refreshToken = oAuthCode.getRefreshToken();
        String email = oAuthCode.getEmail();
        oAuthCodeRepository.delete(oAuthCode);

        return Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "email", email
        );
    }
}
