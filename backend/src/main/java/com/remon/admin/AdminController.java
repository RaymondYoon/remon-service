package com.remon.admin;

import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import com.remon.book.service.CloudinaryService;
import com.remon.book.service.ImagenService;
import com.remon.library.repository.UserBookRepository;
import com.remon.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final BookRepository bookRepository;
    private final ReviewRepository reviewRepository;
    private final UserBookRepository userBookRepository;
    private final ImagenService imagenService;
    private final CloudinaryService cloudinaryService;

    @DeleteMapping("/books/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteBook(@PathVariable Long id) {
        if (!bookRepository.existsById(id)) {
            throw new NoSuchElementException("책을 찾을 수 없습니다. id=" + id);
        }
        reviewRepository.deleteByBookId(id);
        userBookRepository.deleteByBookId(id);
        bookRepository.deleteById(id);
    }

    @DeleteMapping("/reviews/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteReview(@PathVariable Long id) {
        if (!reviewRepository.existsById(id)) {
            throw new NoSuchElementException("리뷰를 찾을 수 없습니다. id=" + id);
        }
        reviewRepository.deleteById(id);
    }

    @PostMapping("/books/generate-covers")
    public Map<String, Object> generateMissingCovers() {
        List<Book> books = bookRepository.findDoneBooksWithoutCover();
        int success = 0, failed = 0;
        for (Book book : books) {
            try {
                byte[] imageBytes = imagenService.generateCoverImage(book.getTitle(), book.getGenre(), book.getContent());
                if (imageBytes != null) {
                    String url = cloudinaryService.uploadImage(imageBytes, "book-" + book.getId());
                    if (url != null) {
                        book.setCoverImageUrl(url);
                        bookRepository.save(book);
                        log.info("표지 생성 완료 - bookId: {}, url: {}", book.getId(), url);
                        success++;
                        continue;
                    }
                }
                log.warn("표지 생성 실패 - bookId: {}", book.getId());
                failed++;
            } catch (Exception e) {
                log.warn("표지 생성 오류 - bookId: {}, message: {}", book.getId(), e.getMessage());
                failed++;
            }
        }
        return Map.of("total", books.size(), "success", success, "failed", failed);
    }
}
