package com.remon.admin;

import com.remon.book.repository.BookRepository;
import com.remon.library.repository.UserBookRepository;
import com.remon.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final BookRepository bookRepository;
    private final ReviewRepository reviewRepository;
    private final UserBookRepository userBookRepository;

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
}
