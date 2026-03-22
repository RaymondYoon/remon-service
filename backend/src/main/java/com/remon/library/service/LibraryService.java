package com.remon.library.service;

import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import com.remon.library.dto.LibraryRequest;
import com.remon.library.dto.LibraryResponse;
import com.remon.library.entity.UserBook;
import com.remon.library.repository.UserBookRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
@RequiredArgsConstructor
public class LibraryService {

    private final UserBookRepository userBookRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    public LibraryResponse addToLibrary(String email, LibraryRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new NoSuchElementException("책을 찾을 수 없습니다. id=" + request.getBookId()));

        if (userBookRepository.existsByUserIdAndBookId(user.getId(), book.getId())) {
            throw new IllegalStateException("이미 서재에 담긴 책입니다.");
        }

        UserBook userBook = UserBook.builder()
                .user(user)
                .book(book)
                .build();

        return LibraryResponse.from(userBookRepository.save(userBook));
    }

    @Transactional(readOnly = true)
    public List<LibraryResponse> getMyLibrary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        return userBookRepository.findByUserId(user.getId()).stream()
                .map(LibraryResponse::from)
                .toList();
    }
}
