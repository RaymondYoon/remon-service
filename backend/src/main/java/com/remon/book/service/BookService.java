package com.remon.book.service;

import com.remon.book.dto.BookRequest;
import com.remon.book.dto.BookResponse;
import com.remon.book.dto.GenerateBookRequest;
import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.follow.repository.FollowRepository;
import com.remon.lemon.service.LemonService;
import com.remon.library.repository.UserBookRepository;
import com.remon.review.repository.ReviewRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
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
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@Transactional
public class BookService {
    private final BookRepository bookRepository;
    private final OpenAiService openAiService;
    private final UserRepository userRepository;
    private final UserBookRepository userBookRepository;
    private final BookGenerationTask bookGenerationTask;
    private final FollowRepository followRepository;
    private final ReviewRepository reviewRepository;
    private final LemonService lemonService;

    public BookService(BookRepository bookRepository, OpenAiService openAiService,
                       UserRepository userRepository, UserBookRepository userBookRepository,
                       BookGenerationTask bookGenerationTask, FollowRepository followRepository,
                       ReviewRepository reviewRepository, LemonService lemonService) {
        this.bookRepository     = bookRepository;
        this.openAiService      = openAiService;
        this.userRepository     = userRepository;
        this.userBookRepository = userBookRepository;
        this.bookGenerationTask = bookGenerationTask;
        this.followRepository   = followRepository;
        this.reviewRepository   = reviewRepository;
        this.lemonService       = lemonService;
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
        return buildResponse(savedBook, null, null);
    }

    public BookResponse generateBook(GenerateBookRequest request, String email) {
        if (request.getKeywords() == null || request.getKeywords().isEmpty()) {
            throw new IllegalArgumentException("키워드를 1개 이상 입력해주세요.");
        }

        lemonService.consumeLemon(email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        String author = (user.getNickname() != null && !user.getNickname().isBlank())
                ? user.getNickname() : "Remon AI";

        Book book = Book.builder()
                .title("생성 중...")
                .author(author)
                .description("키워드: " + String.join(", ", request.getKeywords()))
                .isAiGenerated(true)
                .genre(request.getGenre())
                .tone(request.getTone())
                .publishedDate(LocalDate.now())
                .price(0.0)
                .publishedBy(user.getId())
                .status(BookStatus.PENDING)
                .build();

        Book savedBook = bookRepository.save(book);
        bookGenerationTask.run(savedBook.getId(), request.getKeywords(),
                request.getGenre(), request.getTone(),
                request.getEnding(), request.getProtagonistName(),
                request.getProtagonistTrait(), request.getViewpoint());
        return buildResponse(savedBook, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getBookStatus(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + id));
        String status = book.getStatus() != null ? book.getStatus().name() : BookStatus.DONE.name();
        String step;
        if ("DONE".equals(status)) {
            step = "DONE";
        } else if ("FAILED".equals(status)) {
            step = "FAILED";
        } else if ("GENERATING".equals(status)) {
            step = (book.getContent() != null && !book.getContent().isBlank()) ? "IMAGE" : "TEXT";
        } else {
            step = "TEXT";
        }
        Map<String, String> result = new HashMap<>();
        result.put("status", status);
        result.put("step", step);
        return result;
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getMyBooks(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        List<Book> books = bookRepository.findMyGeneratedBooks(user.getId());
        Map<Long, Double> ratingCache = buildRatingCache(books);
        return books.stream()
                .map(b -> buildResponse(b, null, ratingCache.get(b.getId())))
                .collect(Collectors.toList());
    }

    public void deleteMyBook(String email, Long bookId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + bookId));
        if (!user.getId().equals(book.getPublishedBy())) {
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        reviewRepository.deleteByBookId(bookId);
        userBookRepository.deleteByBookId(bookId);
        bookRepository.delete(book);
    }

    public BookResponse getBookById(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + id));
        Double avgRating = reviewRepository.findAverageRatingByBookId(id);
        return buildResponse(book, null, avgRating);
    }

    public List<BookResponse> getAllBooks(String keyword) {
        List<Book> books = (keyword != null && !keyword.isBlank())
                ? bookRepository.searchByKeywordAndDone(keyword, BookStatus.DONE)
                : bookRepository.findAllDone(BookStatus.DONE);
        Map<Long, Double> ratingCache = buildRatingCache(books);
        return books.stream()
                .map(b -> buildResponse(b, null, ratingCache.get(b.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getAllBooksPageable(String keyword, Pageable pageable) {
        Page<Book> page = (keyword != null && !keyword.isBlank())
                ? bookRepository.searchByKeywordPageableAndDone(keyword, BookStatus.DONE, pageable)
                : bookRepository.findAllDonePageable(BookStatus.DONE, pageable);
        Map<Long, Double> ratingCache = buildRatingCache(page.getContent());
        List<BookResponse> content = page.getContent().stream()
                .map(b -> buildResponse(b, null, ratingCache.get(b.getId())))
                .collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBooksCursor(String keyword, Long cursor, int size) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        List<Book> books = bookRepository.findBooksWithCursor(cursor, kw, BookStatus.DONE, PageRequest.of(0, size));
        Map<Long, Double> ratingCache = buildRatingCache(books);
        List<BookResponse> content = books.stream()
                .map(b -> buildResponse(b, null, ratingCache.get(b.getId())))
                .collect(Collectors.toList());
        Long nextCursor = books.isEmpty() ? null : books.get(books.size() - 1).getId();
        boolean hasMore = books.size() == size;
        Map<String, Object> result = new HashMap<>();
        result.put("books", content);
        result.put("nextCursor", nextCursor);
        result.put("hasMore", hasMore);
        return result;
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getPublicBooks() {
        List<Book> books = bookRepository.findPublicBooks();
        Map<Long, String> nicknameCache = buildNicknameCache(books);
        Map<Long, Double> ratingCache = buildRatingCache(books);
        return books.stream()
                .map(b -> buildResponse(b, nicknameCache.get(b.getPublishedBy()), ratingCache.get(b.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getFeedBooks(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        List<Long> followingIds = followRepository.findFollowingIds(user.getId());
        if (followingIds.isEmpty()) return List.of();
        List<Book> books = bookRepository.findFeedBooks(followingIds);
        Map<Long, String> nicknameCache = buildNicknameCache(books);
        Map<Long, Double> ratingCache = buildRatingCache(books);
        return books.stream()
                .map(b -> buildResponse(b, nicknameCache.get(b.getPublishedBy()), ratingCache.get(b.getId())))
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
        reviewRepository.findAverageRatingsByBookIds(bookIds)
                .forEach(row -> map.put((Long) row[0], (Double) row[1]));
        return map;
    }

    private BookResponse buildResponse(Book book, String nickname, Double avgRating) {
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
                .status(book.getStatus() != null ? book.getStatus().name() : BookStatus.DONE.name())
                .isPublic(book.isPublic())
                .publishedBy(book.getPublishedBy())
                .authorNickname(nickname)
                .averageRating(avgRating)
                .build();
    }
}
