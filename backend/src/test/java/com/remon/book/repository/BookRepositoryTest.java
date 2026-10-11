package com.remon.book.repository;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BookRepositoryTest {

    @Autowired private BookRepository bookRepository;
    @Autowired private EntityManager em;

    private Long doneAi, pendingAi, manual;

    private Long save(String title, String author, boolean ai, BookStatus status) {
        return bookRepository.save(Book.builder()
                .title(title).author(author).isAiGenerated(ai).status(status).build()).getId();
    }

    @BeforeEach
    void setUp() {
        doneAi    = save("우주 고양이", "레몬", true, BookStatus.DONE);
        pendingAi = save("생성 중...", "레몬", true, BookStatus.PENDING);
        manual    = save("수동 등록 책", "관리자", false, BookStatus.DONE);
    }

    @Test
    @DisplayName("findVisibleBooks - 생성 중인 AI 책은 제외하고, keyword 가 null 이면 전체")
    void findVisibleBooks_전체() {
        List<Book> books = bookRepository.findVisibleBooks(null, BookStatus.DONE);

        assertThat(books).extracting(Book::getId).containsExactlyInAnyOrder(doneAi, manual);
    }

    @Test
    @DisplayName("findVisibleBooks - 제목/작가 키워드 검색 (대소문자 무시)")
    void findVisibleBooks_키워드() {
        assertThat(bookRepository.findVisibleBooks("고양이", BookStatus.DONE))
                .extracting(Book::getId).containsExactly(doneAi);
        assertThat(bookRepository.findVisibleBooks("관리자", BookStatus.DONE))
                .extracting(Book::getId).containsExactly(manual);
    }

    @Test
    @DisplayName("findVisibleBooksPage - 페이지 내용과 전체 개수")
    void findVisibleBooksPage() {
        Page<Book> page = bookRepository.findVisibleBooksPage(null, BookStatus.DONE, PageRequest.of(0, 1));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("findBooksWithCursor - id 내림차순, cursor 미만만")
    void findBooksWithCursor() {
        List<Book> first = bookRepository.findBooksWithCursor(null, null, BookStatus.DONE, PageRequest.of(0, 1));
        assertThat(first).extracting(Book::getId).containsExactly(manual);

        List<Book> next = bookRepository.findBooksWithCursor(manual, null, BookStatus.DONE, PageRequest.of(0, 1));
        assertThat(next).extracting(Book::getId).containsExactly(doneAi);
    }

    @Test
    @DisplayName("saveGeneratedText - GENERATING 상태에서만 저장 (enum 리터럴 비교)")
    void saveGeneratedText_GENERATING_일때만() {
        assertThat(bookRepository.saveGeneratedText(pendingAi, "제목", "본문")).isZero();

        bookRepository.transitionStatus(pendingAi, List.of(BookStatus.PENDING), BookStatus.GENERATING);
        assertThat(bookRepository.saveGeneratedText(pendingAi, "제목", "본문")).isEqualTo(1);

        em.clear();
        assertThat(bookRepository.findById(pendingAi).orElseThrow().getContent()).isEqualTo("본문");
    }
}
