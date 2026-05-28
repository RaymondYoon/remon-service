package com.remon.admin;

import com.remon.book.repository.BookRepository;
import com.remon.book.service.BookGenerationTask;
import com.remon.library.repository.UserBookRepository;
import com.remon.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
    private final BookGenerationTask bookGenerationTask;

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
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> generateMissingCovers() {
        int queued = bookRepository.findDoneBooksWithoutCover().size();
        bookGenerationTask.generateMissingCoversAsync();
        log.info("표지 일괄 생성 요청 - queued: {}", queued);
        return Map.of("queued", queued, "message", "백그라운드로 표지 생성을 시작했습니다. Railway 로그에서 진행 상황을 확인하세요.");
    }
}
