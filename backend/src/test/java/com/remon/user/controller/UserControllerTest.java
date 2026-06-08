package com.remon.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.remon.config.SecurityConfig;
import com.remon.follow.repository.FollowRepository;
import com.remon.lemon.service.LemonService;
import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginRequest;
import com.remon.user.entity.RefreshToken;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.service.RefreshTokenService;
import com.remon.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * @WebMvcTest: 컨트롤러 레이어만 로드 (DB 불필요)
 *
 * - @Import(SecurityConfig.class): 커스텀 SecurityFilterChain (CSRF disable, permitAll 설정) 적용
 * - @TestPropertySource: SecurityConfig → JwtTokenProvider 생성 시 jwt.secret 주입
 * - @MockitoBean: UserController 의존 빈 전부 mock 처리
 */
@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "jwt.secret=dGVzdFNlY3JldEtleUZvckp3dFRlc3RpbmdQdXJwb3Nl",
        "jwt.expiration=3600000",
        "kakao.client-id=test-client-id",
        "kakao.redirect-uri=http://localhost/test"
})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @MockitoBean
    private FollowRepository followRepository;

    @MockitoBean
    private LemonService lemonService;

    // @EnableJpaAuditing 활성화 후 @WebMvcTest 환경에서
    // "JPA metamodel must not be empty" 오류 방지
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    // ── 로그인 ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/users/login - 로그인 성공 시 JWT accessToken 포함 응답")
    void login_성공_시_토큰_반환() throws Exception {
        User mockUser = User.builder()
                .email("user@test.com")
                .password("encoded")
                .provider("local")
                .nickname("tester")
                .role(Role.USER)
                .build();

        RefreshToken mockRefreshToken = RefreshToken.builder()
                .id(1L)
                .email("user@test.com")
                .token("mock.refresh.token")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        when(userService.login("user@test.com", "pass1234")).thenReturn(mockUser);
        when(jwtTokenProvider.generateToken("user@test.com", "USER")).thenReturn("mock.jwt.token");
        when(refreshTokenService.createRefreshToken("user@test.com")).thenReturn(mockRefreshToken);

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("pass1234");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock.jwt.token"))
                .andExpect(jsonPath("$.email").value("user@test.com"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    @DisplayName("POST /api/users/login - 존재하지 않는 이메일로 로그인 시 400")
    void login_실패_시_400_반환() throws Exception {
        when(userService.login("nobody@test.com", "pass"))
                .thenThrow(new IllegalStateException("존재하지 않는 이메일입니다."));

        LoginRequest req = new LoginRequest();
        req.setEmail("nobody@test.com");
        req.setPassword("pass");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest()); // GlobalExceptionHandler: IllegalStateException → 400
    }

    // ── 회원가입 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/users/register - 회원가입 성공 시 200")
    void register_성공_시_200_반환() throws Exception {
        User mockUser = User.builder()
                .email("new@test.com")
                .password("encoded")
                .provider("local")
                .nickname("newbie")
                .role(Role.USER)
                .build();

        when(userService.registerUser(any(), any(), any(), any(), any()))
                .thenReturn(mockUser);

        String body = """
                {
                    "email": "new@test.com",
                    "password": "rawPw1234",
                    "provider": "local",
                    "providerId": null,
                    "nickname": "newbie"
                }
                """;

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@test.com"));
    }
}
