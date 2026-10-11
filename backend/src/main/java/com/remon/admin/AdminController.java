package com.remon.admin;

import com.remon.book.service.BookService;
import com.remon.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final BookService bookService;
    private final ReviewService reviewService;

    @DeleteMapping("/books/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBook(@PathVariable Long id) {
        bookService.deleteBookAsAdmin(id);
    }

    @DeleteMapping("/reviews/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable Long id) {
        reviewService.deleteReviewAsAdmin(id);
    }

    @PostMapping("/books/generate-covers")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CoverGenerationResponse generateMissingCovers() {
        int queued = bookService.generateMissingCovers();
        log.info("표지 일괄 생성 요청 - queued: {}", queued);
        return new CoverGenerationResponse(queued, "백그라운드로 표지 생성을 시작했습니다. Railway 로그에서 진행 상황을 확인하세요.");
    }
}
