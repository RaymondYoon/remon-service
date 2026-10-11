package com.remon.book.service;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.lemon.entity.UserLemon;
import com.remon.lemon.repository.UserLemonRepository;
import com.remon.lemon.service.LemonService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 실제 DB(H2)에서 조건부 UPDATE 기반 상태 전이·중복 환불 방지를 검증한다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({BookGenerationFailureService.class, LemonService.class})
class BookGenerationFailureServiceTest {

    private static final Long USER_ID = 100L;

    @Autowired private BookGenerationFailureService failureService;
    @Autowired private BookRepository bookRepository;
    @Autowired private UserLemonRepository userLemonRepository;
    @Autowired private EntityManager em;

    private Long saveBook(BookStatus status, LocalDateTime createdAt) {
        Book book = Book.builder()
                .title("생성 중...")
                .isAiGenerated(true)
                .publishedBy(USER_ID)
                .status(status)
                .createdAt(createdAt)
                .build();
        return bookRepository.save(book).getId();
    }

    private Book reload(Long id) {
        em.flush();
        em.clear();
        return bookRepository.findById(id).orElseThrow();
    }

    private int lemonCount() {
        em.flush();
        em.clear();
        return userLemonRepository.findById(USER_ID).orElseThrow().getLemonCount();
    }

    @Test
    @DisplayName("GENERATING 책 실패 처리 → FAILED + 레몬 1개 환불 + 환불 플래그 설정")
    void failAndRefund_실패_처리와_환불() {
        userLemonRepository.save(new UserLemon(USER_ID, 0, LocalDate.now()));
        Long bookId = saveBook(BookStatus.GENERATING, LocalDateTime.now());

        boolean refunded = failureService.failAndRefund(bookId);

        assertThat(refunded).isTrue();
        Book book = reload(bookId);
        assertThat(book.getStatus()).isEqualTo(BookStatus.FAILED);
        assertThat(book.isLemonRefunded()).isTrue();
        assertThat(lemonCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("같은 책에 여러 번 호출돼도(작업 예외 + 복구 작업) 레몬은 한 번만 환불된다")
    void failAndRefund_중복_환불_방지() {
        userLemonRepository.save(new UserLemon(USER_ID, 0, LocalDate.now()));
        Long bookId = saveBook(BookStatus.PENDING, LocalDateTime.now());

        boolean first = failureService.failAndRefund(bookId);
        boolean second = failureService.failAndRefund(bookId);

        assertThat(first).isTrue();
        assertThat(second).isFalse();
        assertThat(lemonCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("이미 DONE인 책은 FAILED로 바꾸지 않고 환불하지도 않는다")
    void failAndRefund_DONE_책은_무시() {
        userLemonRepository.save(new UserLemon(USER_ID, 0, LocalDate.now()));
        Long bookId = saveBook(BookStatus.DONE, LocalDateTime.now());

        boolean refunded = failureService.failAndRefund(bookId);

        assertThat(refunded).isFalse();
        assertThat(reload(bookId).getStatus()).isEqualTo(BookStatus.DONE);
        assertThat(lemonCount()).isZero();
    }

    @Test
    @DisplayName("findStaleIds - 기준 시각 이전에 생성된 PENDING/GENERATING 책만 조회")
    void findStaleIds_오래된_진행중_책만() {
        LocalDateTime now = LocalDateTime.now();
        Long stalePending    = saveBook(BookStatus.PENDING,    now.minusMinutes(30));
        Long staleGenerating = saveBook(BookStatus.GENERATING, now.minusMinutes(20));
        saveBook(BookStatus.GENERATING, now.minusMinutes(1));   // 아직 진행 중일 수 있음
        saveBook(BookStatus.DONE,       now.minusMinutes(60));  // 완료된 책
        saveBook(BookStatus.FAILED,     now.minusMinutes(60));  // 이미 실패한 책

        List<Long> ids = bookRepository.findStaleIds(
                List.of(BookStatus.PENDING, BookStatus.GENERATING), now.minusMinutes(15));

        assertThat(ids).containsExactlyInAnyOrder(stalePending, staleGenerating);
    }

    @Test
    @DisplayName("transitionStatus - 현재 상태가 from 에 없으면 바꾸지 않는다 (FAILED 책을 DONE으로 되살리지 않음)")
    void transitionStatus_조건부_전이() {
        Long bookId = saveBook(BookStatus.FAILED, LocalDateTime.now());

        int changed = bookRepository.transitionStatus(bookId, List.of(BookStatus.GENERATING), BookStatus.DONE);

        assertThat(changed).isZero();
        assertThat(reload(bookId).getStatus()).isEqualTo(BookStatus.FAILED);
    }
}
