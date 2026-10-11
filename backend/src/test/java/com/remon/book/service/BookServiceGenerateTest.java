package com.remon.book.service;

import com.remon.book.dto.GenerateBookRequest;
import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.follow.repository.FollowRepository;
import com.remon.lemon.service.LemonService;
import com.remon.library.repository.UserBookRepository;
import com.remon.review.repository.ReviewRepository;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookServiceGenerateTest {

    @Mock private BookRepository bookRepository;
    @Mock private OpenAiService openAiService;
    @Mock private UserRepository userRepository;
    @Mock private UserBookRepository userBookRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private FollowRepository followRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private LemonService lemonService;

    @InjectMocks private BookService bookService;

    @Test
    @DisplayName("generateBook - 레몬 차감 후 PENDING 책을 저장하고, 생성은 이벤트로만 요청한다 (커밋 후 시작)")
    void generateBook_이벤트_발행() {
        User user = User.builder().id(7L).email("a@b.c").nickname("작가").role(Role.USER).build();
        when(userRepository.findByEmail("a@b.c")).thenReturn(Optional.of(user));
        when(bookRepository.save(any(Book.class))).thenAnswer(inv -> {
            Book b = inv.getArgument(0);
            ReflectionTestUtils.setField(b, "id", 42L);
            return b;
        });

        GenerateBookRequest request = new GenerateBookRequest();
        ReflectionTestUtils.setField(request, "keywords", List.of("우주"));
        ReflectionTestUtils.setField(request, "genre", "SF");
        ReflectionTestUtils.setField(request, "tone", List.of("WARM"));

        bookService.generateBook(request, "a@b.c");

        verify(lemonService).consumeLemon("a@b.c");
        ArgumentCaptor<Book> saved = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(BookStatus.PENDING);

        ArgumentCaptor<BookGenerationRequestedEvent> event = ArgumentCaptor.forClass(BookGenerationRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().bookId()).isEqualTo(42L);
        assertThat(event.getValue().prompt().keywords()).containsExactly("우주");
        verifyNoInteractions(openAiService);
    }
}
