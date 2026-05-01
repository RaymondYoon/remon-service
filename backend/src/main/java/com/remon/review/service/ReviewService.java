package com.remon.review.service;

import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import com.remon.notification.entity.NotificationType;
import com.remon.notification.service.NotificationService;
import com.remon.review.dto.ReviewRequest;
import com.remon.review.dto.ReviewResponse;
import com.remon.review.entity.Review;
import com.remon.review.repository.ReviewRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ReviewService(ReviewRepository reviewRepository, BookRepository bookRepository,
                         UserRepository userRepository, NotificationService notificationService) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public ReviewResponse createReview(String email, Long bookId, ReviewRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + bookId));
        if (reviewRepository.existsByBookIdAndUserId(bookId, user.getId())) {
            throw new IllegalStateException("이미 리뷰를 작성했습니다.");
        }
        Review review = Review.builder()
                .book(book)
                .user(user)
                .rating(request.getRating())
                .content(request.getContent())
                .build();
        ReviewResponse response = toResponse(reviewRepository.save(review));
        if (book.getPublishedBy() != null) {
            String message = user.getNickname() + "님이 '" + book.getTitle() + "'에 리뷰를 남겼습니다.";
            notificationService.createNotification(book.getPublishedBy(), user.getId(), NotificationType.REVIEW, message);
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviews(Long bookId) {
        return reviewRepository.findByBookIdOrderByCreatedAtDesc(bookId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void deleteReview(String email, Long bookId, Long reviewId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NoSuchElementException("리뷰를 찾을 수 없습니다. id=" + reviewId));
        if (!review.getBook().getId().equals(bookId)) {
            throw new IllegalArgumentException("해당 책의 리뷰가 아닙니다.");
        }
        if (!review.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        reviewRepository.delete(review);
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .bookId(review.getBook().getId())
                .userId(review.getUser().getId())
                .nickname(review.getUser().getNickname())
                .rating(review.getRating())
                .content(review.getContent())
                .createdAt(review.getCreatedAt() != null
                        ? review.getCreatedAt().toLocalDate().toString() : null)
                .build();
    }
}
