package com.remon.user.service;

import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private BCryptPasswordEncoder passwordEncoder;
    private UserService userService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        userService = new UserService(userRepository, passwordEncoder);
    }

    // ── 로그인 ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("올바른 이메일·비밀번호로 로그인 성공")
    void login_withValidCredentials_shouldReturnUser() {
        String rawPassword = "pass1234";
        User user = User.builder()
                .email("user@test.com")
                .password(passwordEncoder.encode(rawPassword))
                .provider("local")
                .nickname("tester")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        User result = userService.login("user@test.com", rawPassword);

        assertThat(result.getEmail()).isEqualTo("user@test.com");
        assertThat(result.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("잘못된 비밀번호로 로그인 시 예외 발생")
    void login_withWrongPassword_shouldThrow() {
        User user = User.builder()
                .email("user@test.com")
                .password(passwordEncoder.encode("correctPass"))
                .provider("local")
                .nickname("tester")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.login("user@test.com", "wrongPass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("비밀번호");
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 로그인 시 예외 발생")
    void login_withUnknownEmail_shouldThrow() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login("nobody@test.com", "pass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이메일");
    }

    // ── 회원가입 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("중복 이메일 회원가입 시 예외 발생")
    void registerUser_withDuplicateEmail_shouldThrow() {
        User existing = User.builder()
                .email("dup@test.com")
                .provider("local")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("dup@test.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() ->
                userService.registerUser("dup@test.com", "pw", "local", null, "nick"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("가입");
    }

    @Test
    @DisplayName("신규 회원가입 성공 - 비밀번호는 암호화되어 저장")
    void registerUser_newUser_shouldEncodePassword() {
        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.registerUser("new@test.com", "rawPw", "local", null, "newbie");

        assertThat(result.getEmail()).isEqualTo("new@test.com");
        // 저장된 비밀번호가 원문이 아닌 BCrypt 해시인지 확인
        assertThat(passwordEncoder.matches("rawPw", result.getPassword())).isTrue();
    }
}
