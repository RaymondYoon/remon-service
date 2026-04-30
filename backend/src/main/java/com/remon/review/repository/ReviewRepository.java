package com.remon.review.repository;

import com.remon.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBookIdOrderByCreatedAtDesc(Long bookId);

    boolean existsByBookIdAndUserId(Long bookId, Long userId);

    Optional<Review> findByBookIdAndUserId(Long bookId, Long userId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.book.id = :bookId")
    Double findAverageRatingByBookId(@Param("bookId") Long bookId);

    @Query("SELECT r.book.id, AVG(r.rating) FROM Review r WHERE r.book.id IN :bookIds GROUP BY r.book.id")
    List<Object[]> findAverageRatingsByBookIds(@Param("bookIds") List<Long> bookIds);

    void deleteByBookId(Long bookId);
}
