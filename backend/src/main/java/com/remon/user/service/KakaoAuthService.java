package com.remon.user.service;

import com.remon.user.dto.KakaoTokenResponse;
import com.remon.user.dto.KakaoUserInfoResponse;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@Transactional
public class KakaoAuthService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${kakao.client-id}")
    private String clientId;

    @Value("${kakao.redirect-uri}")
    private String redirectUri;

    public KakaoAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 인가 코드 → 액세스 토큰 → 사용자 정보 → DB 저장/조회 → User 반환
     */
    public User processKakaoLogin(String code) {
        String accessToken = getKakaoAccessToken(code);
        KakaoUserInfoResponse userInfo = getKakaoUserInfo(accessToken);
        return findOrCreateUser(userInfo);
    }

    private String getKakaoAccessToken(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<KakaoTokenResponse> response = restTemplate.postForEntity(
                "https://kauth.kakao.com/oauth/token", request, KakaoTokenResponse.class);

        return response.getBody().getAccessToken();
    }

    private KakaoUserInfoResponse getKakaoUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<KakaoUserInfoResponse> response = restTemplate.exchange(
                "https://kapi.kakao.com/v2/user/me",
                HttpMethod.GET, request, KakaoUserInfoResponse.class);

        return response.getBody();
    }

    private User findOrCreateUser(KakaoUserInfoResponse userInfo) {
        String providerId = String.valueOf(userInfo.getId());

        // 기존 카카오 계정이면 바로 반환
        return userRepository.findByProviderAndProviderId("kakao", providerId)
                .orElseGet(() -> {
                    String email = userInfo.getEmail() != null
                            ? userInfo.getEmail()
                            : "kakao_" + providerId + "@kakao.com";

                    // 동일 이메일로 이미 로컬 가입된 경우 그 계정을 반환 (이메일 연동)
                    return userRepository.findByEmail(email)
                            .orElseGet(() -> userRepository.save(User.builder()
                                    .email(email)
                                    .provider("kakao")
                                    .providerId(providerId)
                                    .nickname(userInfo.getNickname())
                                    .role(Role.USER)
                                    .build()));
                });
    }
}
