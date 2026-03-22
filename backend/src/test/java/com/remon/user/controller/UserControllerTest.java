package com.remon.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.remon.config.SecurityConfig;
import com.remon.security.JwtTokenProvider;
import com.remon.user.dto.LoginRequest;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * @WebMvcTest: 컨트롤러 레이어만 로드 (DB 불필요)
 *
 * - @Import(SecurityConfig.class): @WebMvcTest는 @Configuration 클래스를
 *   자동으로 포함하지 않는 경우가 있으므로 명시적으로 임포트.
 *   이를 통해 커스텀 SecurityFilterChain (CSRF disable, permitAll 설정)이 적용된다.
 * - @TestPropertySource: SecurityConfig → JwtTokenProvider 생성 시
 *   jwt.secret 프로퍼티를 테스트 컨텍스트에 직접 주입
 * - @MockitoBean JwtTokenProvider: 실제 토큰 생성/검증 대신 mock 반환
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

    // @EnableJpaAuditing 활성화 후 @WebMvcTest 환경에서
    // "JPA metamodel must not be empty" 오류 방지
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    // ── 로그인 ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/users/login - 로그인 성공 시 JWT 토큰 포함 응답")
    void login_shouldReturn200WithToken() throws Exception {
        User mockUser = User.builder()
                .email("user@test.com")
                .password("encoded")
                .provider("local")
                .nickname("tester")
                .role(Role.USER)
                .build();

        when(userService.login("user@test.com", "pass1234")).thenReturn(mockUser);
        when(jwtTokenProvider.generateToken("user@test.com", "USER")).thenReturn("mock.jwt.token");

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("pass1234");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock.jwt.token"))
                .andExpect(jsonPath("$.email").value("user@test.com"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    @DisplayName("POST /api/users/login - 존재하지 않는 이메일로 로그인 시 400")
    void login_withUnknownEmail_shouldReturn400() throws Exception {
        when(userService.login("nobody@test.com", "pass"))
                .thenThrow(new IllegalStateException("존재하지 않는 이메일입니다."));

        LoginRequest req = new LoginRequest();
        req.setEmail("nobody@test.com");
        req.setPassword("pass");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());  // GlobalExceptionHandler: IllegalStateException → 400
    }

    // ── 회원가입 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/users/register - 회원가입 성공 시 200")
    void register_shouldReturn200() throws Exception {
        User mockUser = User.builder()
                .email("new@test.com")
                .password("encoded")
                .provider("local")
                .nickname("newbie")
                .role(Role.USER)
                .build();

        // UserRequest는 @Getter @NoArgsConstructor만 있어 Jackson이 private 필드에
        // 값을 주입할 수 없음 → 컨트롤러에 null 값이 전달될 수 있으므로 any() 매처 사용
        when(userService.registerUser(any(), any(), any(), any(), any()))
                .thenReturn(mockUser);

        String body = """
                {
                    "email": "new@test.com",
                    "password": "rawPw",
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
