package com.remon.book.repository;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    // ── 공통 JPQL 조건 ─────────────────────────────────────────────────────
    // 목록 노출 대상: 수동 등록 책 또는 생성 완료(DONE)된 AI 책
    String VISIBLE = "(b.isAiGenerated = false OR b.status = :doneStatus)";
    // 키워드 검색: 제목/작가 (keyword 가 null 이면 조건 무시)
    String KEYWORD_MATCH = """
            (:keyword IS NULL
             OR LOWER(b.title)  LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(b.author) LIKE LOWER(CONCAT('%', :keyword, '%')))""";
    String VISIBLE_AND_KEYWORD = " WHERE " + VISIBLE + " AND " + KEYWORD_MATCH;

    // ── 목록 조회 ──────────────────────────────────────────────────────────

    @Query("SELECT b FROM Book b" + VISIBLE_AND_KEYWORD)
    List<Book> findVisibleBooks(@Param("keyword") String keyword,
                                @Param("doneStatus") BookStatus doneStatus);

    @Query(value = "SELECT b FROM Book b" + VISIBLE_AND_KEYWORD,
           countQuery = "SELECT COUNT(b) FROM Book b" + VISIBLE_AND_KEYWORD)
    Page<Book> findVisibleBooksPage(@Param("keyword") String keyword,
                                    @Param("doneStatus") BookStatus doneStatus,
                                    Pageable pageable);

    @Query("SELECT b FROM Book b" + VISIBLE_AND_KEYWORD
            + " AND (:cursor IS NULL OR b.id < :cursor) ORDER BY b.id DESC")
    List<Book> findBooksWithCursor(
            @Param("cursor") Long cursor,
            @Param("keyword") String keyword,
            @Param("doneStatus") BookStatus doneStatus,
            Pageable pageable
    );

    @Cacheable("books-views")
    @Query("SELECT b FROM Book b" + VISIBLE_AND_KEYWORD + " ORDER BY b.viewCount DESC, b.id DESC")
    List<Book> findBooksSortedByViews(
            @Param("keyword") String keyword,
            @Param("doneStatus") BookStatus doneStatus,
            Pageable pageable
    );

    @Cacheable("books-rating")
    @Query("SELECT b FROM Book b" + VISIBLE_AND_KEYWORD
            + " ORDER BY (SELECT COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.book.id = b.id) DESC, b.id DESC")
    List<Book> findBooksSortedByRating(
            @Param("keyword") String keyword,
            @Param("doneStatus") BookStatus doneStatus,
            Pageable pageable
    );

    @Query("SELECT b FROM Book b WHERE b.publishedBy = :userId AND b.isAiGenerated = true ORDER BY b.publishedDate DESC")
    List<Book> findMyGeneratedBooks(@Param("userId") Long userId);

    @Query("SELECT b FROM Book b WHERE b.isPublic = true AND (b.isAiGenerated = false OR b.status = 'DONE') ORDER BY b.publishedDate DESC")
    List<Book> findPublicBooks();

    @Query("SELECT b FROM Book b WHERE b.isPublic = true AND (b.isAiGenerated = false OR b.status = 'DONE') AND b.publishedBy IN :userIds ORDER BY b.publishedDate DESC")
    List<Book> findFeedBooks(@Param("userIds") List<Long> userIds);

    @Query("SELECT b FROM Book b WHERE b.status = :status AND b.coverImageUrl IS NULL")
    List<Book> findByStatusAndNoCover(@Param("status") BookStatus status);

    // ── 생성 상태 관리 ──────────────────────────────────────────────────────

    /**
     * 현재 상태가 from 중 하나일 때만 to 로 전환한다 (조건부 상태 전이).
     * @return 변경된 행 수 — 0이면 이미 다른 경로(복구 작업·삭제 등)에서 상태가 바뀐 것
     */
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.status = :to WHERE b.id = :id AND b.status IN :from")
    int transitionStatus(@Param("id") Long id,
                         @Param("from") Collection<BookStatus> from,
                         @Param("to") BookStatus to);

    /** GENERATING 상태일 때만 생성된 제목·본문을 저장한다. */
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.title = :title, b.content = :content"
            + " WHERE b.id = :id AND b.status = com.remon.book.entity.BookStatus.GENERATING")
    int saveGeneratedText(@Param("id") Long id, @Param("title") String title, @Param("content") String content);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.coverImageUrl = :url WHERE b.id = :id")
    int updateCoverImageUrl(@Param("id") Long id, @Param("url") String url);

    /**
     * FAILED 상태이고 아직 환불되지 않은 책만 환불 완료로 표시한다.
     * 행 잠금 + 조건부 UPDATE 로 동시에 여러 경로에서 호출돼도 1번만 1을 반환한다.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.lemonRefunded = true"
            + " WHERE b.id = :id AND b.status = com.remon.book.entity.BookStatus.FAILED AND b.lemonRefunded = false")
    int markLemonRefunded(@Param("id") Long id);

    @Query("SELECT b.publishedBy FROM Book b WHERE b.id = :id")
    Optional<Long> findPublisherId(@Param("id") Long id);

    /** threshold 이전에 생성 요청됐는데 아직 끝나지 않은 책 (서버 재시작 등으로 멈춘 작업) */
    @Query("SELECT b.id FROM Book b WHERE b.status IN :statuses AND (b.createdAt IS NULL OR b.createdAt < :threshold)")
    List<Long> findStaleIds(@Param("statuses") Collection<BookStatus> statuses,
                            @Param("threshold") LocalDateTime threshold);

    // ── 기타 갱신 ───────────────────────────────────────────────────────────

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.viewCount = b.viewCount + 1 WHERE b.id = :bookId")
    void incrementViewCount(@Param("bookId") Long bookId);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.author = :newNickname WHERE b.publishedBy = :userId")
    void updateAuthorByPublishedBy(@Param("userId") Long userId, @Param("newNickname") String newNickname);
}
