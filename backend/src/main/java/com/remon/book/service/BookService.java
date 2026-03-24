package com.remon.book.service;

import com.remon.book.dto.BookRequest;
import com.remon.book.dto.BookResponse;
import com.remon.book.dto.GenerateBookRequest;
import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import com.remon.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class BookService {
    private final BookRepository bookRepository;
    private final OpenAiService openAiService;
    private final UserRepository userRepository;

    public BookService(BookRepository bookRepository, OpenAiService openAiService,
                       UserRepository userRepository) {
        this.bookRepository = bookRepository;
        this.openAiService  = openAiService;
        this.userRepository = userRepository;
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
        return mapToResponse(savedBook);
    }

    public BookResponse generateBook(GenerateBookRequest request, String email) {
        if (request.getKeywords() == null || request.getKeywords().isEmpty()) {
            throw new IllegalArgumentException("키워드를 1개 이상 입력해주세요.");
        }

        String author = userRepository.findByEmail(email)
                .map(u -> (u.getNickname() != null && !u.getNickname().isBlank())
                        ? u.getNickname() : "Remon AI")
                .orElse("Remon AI");

        String[] result  = openAiService.generate(
                request.getKeywords(), request.getGenre(),
                request.getLength(),   request.getTone());
        String title   = result[0];
        String content = result[1];

        Book book = Book.builder()
                .title(title)
                .author(author)
                .description("키워드: " + String.join(", ", request.getKeywords()))
                .content(content)
                .isAiGenerated(true)
                .genre(request.getGenre())
                .tone(request.getTone())
                .publishedDate(LocalDate.now())
                .price(0.0)
                .build();

        return mapToResponse(bookRepository.save(book));
    }

    public BookResponse getBookById(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + id));
        return mapToResponse(book);
    }

    public List<BookResponse> getAllBooks(String keyword) {
        List<Book> books = (keyword != null && !keyword.isBlank())
                ? bookRepository.searchByKeyword(keyword)
                : bookRepository.findAll();
        return books.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private BookResponse mapToResponse(Book book) {
        return BookResponse.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())   // 버그 수정: getTitle() → getAuthor()
                .isbn(book.getIsbn())
                .publishedDate(book.getPublishedDate() != null
                        ? book.getPublishedDate().toString() : null)
                .price(book.getPrice())
                .description(book.getDescription())
                .content(book.getContent())
                .isAiGenerated(book.isAiGenerated())
                .genre(book.getGenre())
                .tone(book.getTone())
                .build();
    }
}
