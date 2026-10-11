package com.remon.book.service;

import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 서버 재시작·배포 등으로 중단돼 PENDING/GENERATING 에 멈춘 책을 FAILED 처리하고 레몬을 환불한다.
 *
 * 무중단 배포 중에는 이전 인스턴스가 아직 생성 중일 수 있으므로, 시작 시에도
 * "모든 진행 중 책"이 아니라 stale-after 시간보다 오래된 책만 대상으로 한다.
 */
@Component
public class StaleGenerationRecoveryJob {

    private static final Logger log = LoggerFactory.getLogger(StaleGenerationRecoveryJob.class);

    private static final List<BookStatus> IN_PROGRESS = List.of(BookStatus.PENDING, BookStatus.GENERATING);

    private final BookRepository bookRepository;
    private final BookGenerationFailureService failureService;
    private final Duration staleAfter;
    private final Clock clock;

    public StaleGenerationRecoveryJob(BookRepository bookRepository,
                                      BookGenerationFailureService failureService,
                                      @Value("${book.generation.stale-after-minutes:15}") long staleAfterMinutes,
                                      Clock clock) {
        this.bookRepository = bookRepository;
        this.failureService = failureService;
        this.staleAfter     = Duration.ofMinutes(staleAfterMinutes);
        this.clock          = clock;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverOnStartup() {
        recover();
    }

    @Scheduled(fixedDelayString = "${book.generation.recovery-interval-ms:300000}",
               initialDelayString = "${book.generation.recovery-interval-ms:300000}")
    public void recoverPeriodically() {
        recover();
    }

    /** @return 이번 실행에서 복구 대상으로 잡힌 책 수 */
    public int recover() {
        LocalDateTime threshold = LocalDateTime.now(clock).minus(staleAfter);
        List<Long> staleIds = bookRepository.findStaleIds(IN_PROGRESS, threshold);
        if (staleIds.isEmpty()) return 0;

        log.warn("멈춘 생성 작업 복구 시작 - 대상: {}건, 기준 시각: {}", staleIds.size(), threshold);
        int refunded = 0;
        for (Long bookId : staleIds) {
            try {
                if (failureService.failAndRefund(bookId)) refunded++;
            } catch (Exception e) {
                log.error("멈춘 생성 작업 복구 실패 - bookId: {}", bookId, e);
            }
        }
        log.warn("멈춘 생성 작업 복구 완료 - 대상: {}건, 환불: {}건", staleIds.size(), refunded);
        return staleIds.size();
    }
}
