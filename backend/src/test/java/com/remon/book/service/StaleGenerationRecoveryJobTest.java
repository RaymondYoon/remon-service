package com.remon.book.service;

import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StaleGenerationRecoveryJobTest {

    @Mock private BookRepository bookRepository;
    @Mock private BookGenerationFailureService failureService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-10-11T03:00:00Z"), ZONE);

    private StaleGenerationRecoveryJob newJob() {
        return new StaleGenerationRecoveryJob(bookRepository, failureService, 15, fixedClock);
    }

    @Test
    @DisplayName("stale-after(15분) 이전 시각을 기준으로 진행 중 책을 조회하고 각각 FAILED + 환불 처리")
    void recover_오래된_진행중_책_복구() {
        LocalDateTime expectedThreshold = LocalDateTime.now(fixedClock).minusMinutes(15);
        when(bookRepository.findStaleIds(List.of(BookStatus.PENDING, BookStatus.GENERATING), expectedThreshold))
                .thenReturn(List.of(1L, 2L));
        when(failureService.failAndRefund(any())).thenReturn(true);

        int recovered = newJob().recover();

        assertThat(recovered).isEqualTo(2);
        verify(failureService).failAndRefund(1L);
        verify(failureService).failAndRefund(2L);
    }

    @Test
    @DisplayName("한 건 처리 중 예외가 나도 나머지 책은 계속 복구한다")
    void recover_일부_실패해도_계속() {
        when(bookRepository.findStaleIds(any(), any())).thenReturn(List.of(1L, 2L));
        when(failureService.failAndRefund(1L)).thenThrow(new RuntimeException("DB 오류"));
        when(failureService.failAndRefund(2L)).thenReturn(true);

        newJob().recover();

        verify(failureService).failAndRefund(2L);
    }

    @Test
    @DisplayName("대상이 없으면 아무것도 하지 않는다")
    void recover_대상_없음() {
        when(bookRepository.findStaleIds(any(), any())).thenReturn(List.of());

        assertThat(newJob().recover()).isZero();
        verifyNoInteractions(failureService);
    }
}
