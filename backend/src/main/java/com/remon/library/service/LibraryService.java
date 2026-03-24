package com.remon.library.service;

import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import com.remon.library.dto.LibraryRequest;
import com.remon.library.dto.LibraryResponse;
import com.remon.library.dto.SavePageRequest;
import com.remon.library.dto.UpdateStatusRequest;
import com.remon.library.entity.ReadingStatus;
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

    public LibraryResponse updateStatus(String email, Long bookId, UpdateStatusRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        UserBook userBook = userBookRepository.findByUserIdAndBookId(user.getId(), bookId)
                .orElseThrow(() -> new NoSuchElementException("서재에 없는 책입니다. bookId=" + bookId));

        userBook.updateStatus(request.getStatus());
        return LibraryResponse.from(userBook);
    }

    /**
     * 읽기 시작 — SAVED 상태일 때만 READING으로 변경.
     * 서재에 없거나 이미 READING/DONE이면 아무것도 하지 않음.
     */
    public void startReading(String email, Long bookId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        userBookRepository.findByUserIdAndBookId(user.getId(), bookId)
                .ifPresent(ub -> {
                    if (ub.getStatus() == ReadingStatus.SAVED) {
                        ub.updateStatus(ReadingStatus.READING);
                    }
                });
    }

    /**
     * 현재 읽은 페이지 저장. 서재에 없으면 무시.
     */
    public void savePage(String email, Long bookId, int page) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        userBookRepository.findByUserIdAndBookId(user.getId(), bookId)
                .ifPresent(ub -> ub.updateLastReadPage(page));
    }

    /**
     * 마지막 페이지 도달 시 DONE 처리. 서재에 없으면 무시.
     */
    public void markAsDone(String email, Long bookId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        userBookRepository.findByUserIdAndBookId(user.getId(), bookId)
                .ifPresent(ub -> ub.updateStatus(ReadingStatus.DONE));
    }

    public void deleteFromLibrary(String email, Long bookId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        UserBook userBook = userBookRepository.findByUserIdAndBookId(user.getId(), bookId)
                .orElseThrow(() -> new NoSuchElementException("서재에 없는 책입니다. bookId=" + bookId));

        userBookRepository.delete(userBook);
    }
}
