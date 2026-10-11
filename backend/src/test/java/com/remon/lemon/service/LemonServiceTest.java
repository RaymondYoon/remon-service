package com.remon.lemon.service;

import com.remon.exception.BusinessException;
import com.remon.exception.ErrorCode;
import com.remon.lemon.dto.LemonResponse;
import com.remon.lemon.entity.UserLemon;
import com.remon.lemon.repository.UserLemonRepository;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LemonServiceTest {

    @Mock
    private UserLemonRepository userLemonRepository;

    @Mock
    private UserRepository userRepository;

    private LemonService lemonService;
    private User testUser;

    @BeforeEach
    void setUp() {
        lemonService = new LemonService(userLemonRepository, userRepository);
        testUser = User.builder()
                .id(1L)
                .email("user@test.com")
                .password("pw")
                .provider("local")
                .nickname("tester")
                .role(Role.USER)
                .build();
    }

    @Test
    @DisplayName("consumeLemon - 레몬 1개, 동시 2회 요청 시 레몬 음수 방지")
    void consumeLemon_동시_요청_시_음수_방지() throws InterruptedException {
        // 실제 DB 환경에서는 비관적 락(PESSIMISTIC_WRITE)이 직렬화를 보장.
        // 단위 테스트에서는 공유 UserLemon 객체를 통해 guard 로직(lemonCount < 1 체크)이
        // 레몬 음수 방지를 보장하는지 CountDownLatch로 동시성을 시뮬레이션.
        UserLemon sharedLemon = new UserLemon(1L, 1, LocalDate.now());

        when(userRepository.getByEmail("user@test.com")).thenReturn(testUser);
        when(userLemonRepository.findByUserIdWithLock(1L)).thenReturn(Optional.of(sharedLemon));

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        for (int i = 0; i < 2; i++) {
            new Thread(() -> {
                try {
                    startLatch.await();
                    lemonService.consumeLemon("user@test.com");
                    successCount.incrementAndGet();
                } catch (BusinessException e) {
                    failCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            }).start();
        }

        startLatch.countDown(); // 두 스레드 동시 시작
        doneLatch.await(5, TimeUnit.SECONDS);

        // 핵심 검증: 레몬 개수는 절대 음수가 되어서는 안 됨
        assertThat(sharedLemon.getLemonCount()).isGreaterThanOrEqualTo(0);
        assertThat(successCount.get() + failCount.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("consumeLemon - 레몬 0개일 때 LEMON_INSUFFICIENT 예외 발생")
    void consumeLemon_레몬_부족_시_예외_발생() {
        UserLemon emptyLemon = new UserLemon(1L, 0, LocalDate.now());

        when(userRepository.getByEmail("user@test.com")).thenReturn(testUser);
        when(userLemonRepository.findByUserIdWithLock(1L)).thenReturn(Optional.of(emptyLemon));

        assertThatThrownBy(() -> lemonService.consumeLemon("user@test.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("레몬")
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.LEMON_INSUFFICIENT);
    }

    @Test
    @DisplayName("getLemonInfo - 오늘 이미 충전된 경우 MAX_DAILY로 초기화되지 않음 (하루 한 번만 충전)")
    void chargeLemons_하루_한번만_충전() {
        // Given: 오늘 이미 충전됨 (lastChargeDate = 오늘), lemonCount = 2
        UserLemon alreadyCharged = new UserLemon(1L, 2, LocalDate.now());

        when(userRepository.getByEmail("user@test.com")).thenReturn(testUser);
        when(userLemonRepository.findById(1L)).thenReturn(Optional.of(alreadyCharged));

        // When
        LemonResponse response = lemonService.getLemonInfo("user@test.com");

        // Then: 오늘 이미 충전됐으므로 lemonCount=2 그대로 유지 (MAX_DAILY=3으로 초기화 안 됨)
        assertThat(alreadyCharged.getLemonCount()).isEqualTo(2);
        assertThat(response.getLemonCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("refundLemon - 오늘 소모한 레몬 1개를 돌려준다")
    void refundLemon_오늘_소모분_환불() {
        UserLemon lemon = new UserLemon(1L, 0, LocalDate.now());
        when(userLemonRepository.findByUserIdWithLock(1L)).thenReturn(Optional.of(lemon));

        lemonService.refundLemon(1L);

        assertThat(lemon.getLemonCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("refundLemon - 하루 최대치(MAX_DAILY)를 넘기지 않는다")
    void refundLemon_최대치_초과_방지() {
        UserLemon lemon = new UserLemon(1L, LemonService.MAX_DAILY, LocalDate.now());
        when(userLemonRepository.findByUserIdWithLock(1L)).thenReturn(Optional.of(lemon));

        lemonService.refundLemon(1L);

        assertThat(lemon.getLemonCount()).isEqualTo(LemonService.MAX_DAILY);
    }

    @Test
    @DisplayName("refundLemon - 어제 충전분이면 변경하지 않는다 (다음 조회 시 어차피 최대치로 충전)")
    void refundLemon_지난날_충전분은_변경없음() {
        UserLemon lemon = new UserLemon(1L, 0, LocalDate.now().minusDays(1));
        when(userLemonRepository.findByUserIdWithLock(1L)).thenReturn(Optional.of(lemon));

        lemonService.refundLemon(1L);

        assertThat(lemon.getLemonCount()).isZero();
    }
}
