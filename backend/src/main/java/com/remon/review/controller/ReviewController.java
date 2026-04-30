package com.remon.review.controller;

import com.remon.review.dto.ReviewRequest;
import com.remon.review.dto.ReviewResponse;
import com.remon.review.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books/{bookId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse createReview(@PathVariable Long bookId,
                                       @Valid @RequestBody ReviewRequest request,
                                       Authentication authentication) {
        return reviewService.createReview(authentication.getName(), bookId, request);
    }

    @GetMapping
    public List<ReviewResponse> getReviews(@PathVariable Long bookId) {
        return reviewService.getReviews(bookId);
    }

    @DeleteMapping("/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable Long bookId,
                             @PathVariable Long reviewId,
                             Authentication authentication) {
        reviewService.deleteReview(authentication.getName(), bookId, reviewId);
    }
}
