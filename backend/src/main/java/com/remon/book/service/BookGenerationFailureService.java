package com.remon.book.service;

import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.lemon.service.LemonService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 생성 실패 처리: FAILED 전환 + 레몬 환불.
 * 생성 작업 예외, 작업 큐 거절, 멈춘 작업 복구 등 여러 경로에서 호출되므로 멱등하게 동작한다.
 */
@Service
public class BookGenerationFailureService {

    private static final Logger log = LoggerFactory.getLogger(BookGenerationFailureService.class);

    private static final List<BookStatus> IN_PROGRESS = List.of(BookStatus.PENDING, BookStatus.GENERATING);

    private final BookRepository bookRepository;
    private final LemonService lemonService;

    public BookGenerationFailureService(BookRepository bookRepository, LemonService lemonService) {
        this.bookRepository = bookRepository;
        this.lemonService   = lemonService;
    }

    /**
     * 진행 중(PENDING/GENERATING)인 책을 FAILED로 바꾸고 레몬을 1개 환불한다.
     * 이미 DONE 이거나 삭제된 책은 건드리지 않고, 이미 환불된 책은 다시 환불하지 않는다.
     *
     * @return 이번 호출에서 레몬을 환불했으면 true
     */
    @Transactional
    public boolean failAndRefund(Long bookId) {
        int failed = bookRepository.transitionStatus(bookId, IN_PROGRESS, BookStatus.FAILED);
        if (failed == 1) {
            log.info("책 생성 FAILED 전환 - bookId: {}", bookId);
        }

        // 조건부 UPDATE(FAILED && !lemonRefunded) — 동시에 호출돼도 한 번만 1을 반환
        if (bookRepository.markLemonRefunded(bookId) == 0) {
            return false;
        }
        Long publisherId = bookRepository.findPublisherId(bookId).orElse(null);
        if (publisherId == null) {
            log.warn("환불 대상 사용자를 찾을 수 없음 - bookId: {}", bookId);
            return false;
        }
        lemonService.refundLemon(publisherId);
        log.info("생성 실패 레몬 환불 완료 - bookId: {}, userId: {}", bookId, publisherId);
        return true;
    }
}
