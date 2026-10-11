package com.remon.book.service;

import com.remon.exception.BookNotFoundException;
import com.remon.exception.BusinessException;
import com.remon.exception.ErrorCode;
import com.remon.book.ai.StoryPrompt;
import com.remon.book.dto.BookRequest;
import com.remon.book.dto.BookCursorResponse;
import com.remon.book.dto.BookResponse;
import com.remon.book.dto.BookStatusResponse;
import com.remon.book.dto.BookSummaryResponse;
import com.remon.book.dto.GenerateBookRequest;
import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.follow.repository.FollowRepository;
import com.remon.lemon.service.LemonService;
import com.remon.library.repository.UserBookRepository;
import com.remon.notification.repository.NotificationRepository;
import com.remon.review.repository.ReviewRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class BookService {
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final UserBookRepository userBookRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final FollowRepository followRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final LemonService lemonService;
    private final BookGenerationTask bookGenerationTask;

    public BookService(BookRepository bookRepository,
                       UserRepository userRepository, UserBookRepository userBookRepository,
                       ApplicationEventPublisher eventPublisher, FollowRepository followRepository,
                       ReviewRepository reviewRepository, NotificationRepository notificationRepository,
                       LemonService lemonService, BookGenerationTask bookGenerationTask) {
        this.bookRepository         = bookRepository;
        this.userRepository         = userRepository;
        this.userBookRepository     = userBookRepository;
        this.eventPublisher         = eventPublisher;
        this.followRepository       = followRepository;
        this.reviewRepository       = reviewRepository;
        this.notificationRepository = notificationRepository;
        this.lemonService           = lemonService;
        this.bookGenerationTask     = bookGenerationTask;
    }

    public BookResponse createBook(BookRequest request){
        Book book = Book.builder()
                .title(request.getTitle())
                .author(request.getAuthor())
                .isbn(request.getIsbn())
                .publishedDate(LocalDate.parse(request.getPublishedDate()))
                .price(request.getPrice())
                .description(request.getDescription())
                // isAiGenerated 기본값 false (@Builder.Default)
                // content, genre, tone 은 수동 등록 시 null
                .build();
        Book savedBook = bookRepository.save(book);
        return buildResponse(savedBook, null);
    }

    public BookResponse generateBook(GenerateBookRequest request, String email) {
        if (request.getKeywords() == null || request.getKeywords().isEmpty()) {
            throw new IllegalArgumentException("키워드를 1개 이상 입력해주세요.");
        }

        lemonService.consumeLemon(email);

        User user = userRepository.getByEmail(email);
        String author = (user.getNickname() != null && !user.getNickname().isBlank())
                ? user.getNickname() : "Remon AI";

        Book book = Book.builder()
                .title("생성 중...")
                .author(author)
                .description("키워드: " + String.join(", ", request.getKeywords()))
                .isAiGenerated(true)
                .genre(request.getGenre())
                .tone(request.getTone() != null ? String.join(", ", request.getTone()) : null)
                .publishedDate(LocalDate.now())
                .price(0.0)
                .publishedBy(user.getId())
                .status(BookStatus.PENDING)
                .build();

        Book savedBook = bookRepository.save(book);
        // 실제 생성은 트랜잭션 커밋 후 BookGenerationTask 가 시작한다 (AFTER_COMMIT)
        eventPublisher.publishEvent(new BookGenerationRequestedEvent(savedBook.getId(), StoryPrompt.from(request)));
        return buildResponse(savedBook, null);
    }

    @Transactional(readOnly = true)
    public BookStatusResponse getBookStatus(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));
        BookStatus status = book.getStatus() != null ? book.getStatus() : BookStatus.DONE;
        String step = switch (status) {
            case DONE -> "DONE";
            case FAILED -> "FAILED";
            // 본문이 저장됐으면 표지 생성 단계
            case GENERATING -> (book.getContent() != null && !book.getContent().isBlank()) ? "IMAGE" : "TEXT";
            case PENDING -> "TEXT";
        };
        return new BookStatusResponse(status.name(), step);
    }

    @Transactional(readOnly = true)
    public List<BookSummaryResponse> getMyBooks(String email) {
        User user = userRepository.getByEmail(email);
        return toSummaries(bookRepository.findMyGeneratedBooks(user.getId()), false);
    }

    /** 본인이 만든 책 삭제 */
    @CacheEvict(value = {"books-rating", "books-views"}, allEntries = true)
    public void deleteMyBook(String email, Long bookId) {
        User user = userRepository.getByEmail(email);
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));
        if (!user.getId().equals(book.getPublishedBy())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "삭제 권한이 없습니다.");
        }
        deleteWithRelations(book);
    }

    /** 관리자 삭제 — 소유자 확인 없이 삭제 */
    @CacheEvict(value = {"books-rating", "books-views"}, allEntries = true)
    public void deleteBookAsAdmin(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));
        deleteWithRelations(book);
    }

    /**
     * 표지가 없는 DONE 책 전체에 대해 백그라운드 표지 생성을 시작한다 (관리자).
     * @return 대상 책 수
     */
    @Transactional(readOnly = true)
    public int generateMissingCovers() {
        int queued = bookRepository.findByStatusAndNoCover(BookStatus.DONE).size();
        bookGenerationTask.generateMissingCoversAsync();
        return queued;
    }

    /**
     * 책 한 권의 표지를 백그라운드로 (다시) 생성한다 (관리자). 생성이 끝난(DONE) 책만 대상.
     */
    @Transactional(readOnly = true)
    public void generateCover(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));
        if (book.getStatus() != BookStatus.DONE) {
            throw new IllegalStateException("생성이 완료된 책만 표지를 만들 수 있습니다. status=" + book.getStatus());
        }
        bookGenerationTask.generateCoverAsync(book.getId(), book.getTitle(), book.getGenre(), book.getContent());
    }

    /**
     * 책과 연관 데이터(리뷰·서재·알림)를 삭제하고, 커밋 후 Cloudinary 표지 삭제를 위해 이벤트를 발행한다.
     */
    private void deleteWithRelations(Book book) {
        Long bookId = book.getId();
        reviewRepository.deleteByBookId(bookId);
        userBookRepository.deleteByBookId(bookId);
        notificationRepository.deleteByBookId(bookId);
        bookRepository.delete(book);
        eventPublisher.publishEvent(new BookDeletedEvent(bookId, book.getCoverImageUrl()));
    }

    /**
     * 책 상세 조회 (조회수 +1).
     * 조회수순 캐시(books-views)는 조회마다 비우지 않고 TTL(5분)로 갱신한다.
     */
    public BookResponse getBookById(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));
        bookRepository.incrementViewCount(id);
        Double avgRating = reviewRepository.findAverageRatingByBookId(id);
        return buildResponse(book, avgRating);
    }

    @Transactional(readOnly = true)
    public List<BookSummaryResponse> getAllBooks(String keyword) {
        return toSummaries(bookRepository.findVisibleBooks(normalizeKeyword(keyword), BookStatus.DONE), false);
    }

    @Transactional(readOnly = true)
    public Page<BookSummaryResponse> getAllBooksPageable(String keyword, Pageable pageable) {
        Page<Book> page = bookRepository.findVisibleBooksPage(normalizeKeyword(keyword), BookStatus.DONE, pageable);
        return new PageImpl<>(toSummaries(page.getContent(), false), pageable, page.getTotalElements());
    }

    /**
     * latest: id 커서 기반 무한 스크롤.
     * rating / views: 상위 size 개만 반환 (hasMore=false) — 결과는 5분 캐시.
     */
    @Transactional(readOnly = true)
    public BookCursorResponse getBooksCursor(String keyword, Long cursor, int size, String sort) {
        String kw = normalizeKeyword(keyword);
        PageRequest limit = PageRequest.of(0, size);
        List<Book> books;
        Long nextCursor;
        boolean hasMore;

        if ("rating".equals(sort)) {
            books = bookRepository.findBooksSortedByRating(kw, BookStatus.DONE, limit);
            nextCursor = null;
            hasMore = false;
        } else if ("views".equals(sort)) {
            books = bookRepository.findBooksSortedByViews(kw, BookStatus.DONE, limit);
            nextCursor = null;
            hasMore = false;
        } else {
            books = bookRepository.findBooksWithCursor(cursor, kw, BookStatus.DONE, limit);
            nextCursor = books.isEmpty() ? null : books.get(books.size() - 1).getId();
            hasMore = books.size() == size;
        }

        return new BookCursorResponse(toSummaries(books, false), nextCursor, hasMore);
    }

    @Transactional(readOnly = true)
    public List<BookSummaryResponse> getPublicBooks() {
        return toSummaries(bookRepository.findPublicBooks(), true);
    }

    @Transactional(readOnly = true)
    public List<BookSummaryResponse> getFeedBooks(String email) {
        User user = userRepository.getByEmail(email);
        List<Long> followingIds = followRepository.findFollowingIds(user.getId());
        if (followingIds.isEmpty()) return List.of();
        return toSummaries(bookRepository.findFeedBooks(followingIds), true);
    }

    private static String normalizeKeyword(String keyword) {
        return (keyword != null && !keyword.isBlank()) ? keyword : null;
    }

    /** 평점(배치 조회)과 필요 시 작가 닉네임을 붙여 목록용 응답으로 변환 */
    private List<BookSummaryResponse> toSummaries(List<Book> books, boolean withNickname) {
        Map<Long, Double> ratingCache = buildRatingCache(books);
        Map<Long, String> nicknameCache = withNickname ? buildNicknameCache(books) : Map.of();
        return books.stream()
                .map(b -> buildSummary(b, nicknameCache.get(b.getPublishedBy()), ratingCache.get(b.getId())))
                .collect(Collectors.toList());
    }

    private Map<Long, String> buildNicknameCache(List<Book> books) {
        List<Long> userIds = books.stream()
                .map(Book::getPublishedBy)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getNickname() != null ? u.getNickname() : ""));
    }

    private Map<Long, Double> buildRatingCache(List<Book> books) {
        List<Long> bookIds = books.stream().map(Book::getId).collect(Collectors.toList());
        Map<Long, Double> map = new HashMap<>();
        if (bookIds.isEmpty()) return map;
        reviewRepository.findAverageRatingsByBookIds(bookIds)
                .forEach(row -> map.put((Long) row[0], (Double) row[1]));
        return map;
    }

    private String statusName(Book book) {
        return book.getStatus() != null ? book.getStatus().name() : BookStatus.DONE.name();
    }

    private BookSummaryResponse buildSummary(Book book, String nickname, Double avgRating) {
        return BookSummaryResponse.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .isbn(book.getIsbn())
                .coverImageUrl(book.getCoverImageUrl())
                .publishedDate(book.getPublishedDate() != null
                        ? book.getPublishedDate().toString() : null)
                .price(book.getPrice())
                .description(book.getDescription())
                .isAiGenerated(book.isAiGenerated())
                .genre(book.getGenre())
                .tone(book.getTone())
                .status(statusName(book))
                .isPublic(book.isPublic())
                .publishedBy(book.getPublishedBy())
                .authorNickname(nickname)
                .averageRating(avgRating)
                .viewCount(book.getViewCount())
                .build();
    }

    private BookResponse buildResponse(Book book, Double avgRating) {
        return BookResponse.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .isbn(book.getIsbn())
                .coverImageUrl(book.getCoverImageUrl())
                .publishedDate(book.getPublishedDate() != null
                        ? book.getPublishedDate().toString() : null)
                .price(book.getPrice())
                .description(book.getDescription())
                .content(book.getContent())
                .isAiGenerated(book.isAiGenerated())
                .genre(book.getGenre())
                .tone(book.getTone())
                .status(statusName(book))
                .isPublic(book.isPublic())
                .publishedBy(book.getPublishedBy())
                .averageRating(avgRating)
                .viewCount(book.getViewCount())
                .build();
    }
}
