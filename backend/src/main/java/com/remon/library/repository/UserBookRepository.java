package com.remon.library.repository;

import com.remon.library.entity.UserBook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserBookRepository extends JpaRepository<UserBook, Long> {

    boolean existsByUserIdAndBookId(Long userId, Long bookId);

    List<UserBook> findByUserId(Long userId);

    Optional<UserBook> findByUserIdAndBookId(Long userId, Long bookId);

    void deleteByUserId(Long userId);

    void deleteByBookId(Long bookId);
}
