package com.remon.book.service;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookGenerationTaskTest {

    @Mock private BookRepository bookRepository;
    @Mock private OpenAiService openAiService;
    @Mock private ImagenService imagenService;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private NotificationService notificationService;

    private BookGenerationTask bookGenerationTask;

    private static final Long BOOK_ID = 1L;
    private static final List<String> KEYWORDS = List.of("우주", "고양이");
    private static final String GENRE = "SF";

    @BeforeEach
    void setUp() {
        bookGenerationTask = new BookGenerationTask(
                bookRepository, openAiService, imagenService, cloudinaryService, notificationService);
    }

    @Test
    @DisplayName("텍스트 생성 성공 후 GENERATING 상태 유지 → 이미지 완료 후 DONE 전환")
    void generateBook_텍스트_생성_성공_후_GENERATING_유지() throws Exception {
        // Given
        String[] geminiResult = {"우주 고양이", "소설 본문..."};
        Book mockBook = Book.builder().id(BOOK_ID).publishedBy(10L).genre(GENRE).build();

        when(openAiService.generate(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(geminiResult);
        when(bookRepository.findById(BOOK_ID)).thenReturn(Optional.of(mockBook));
        when(imagenService.generateCoverImage(any(), any(), any())).thenReturn(new byte[]{1, 2, 3});
        when(cloudinaryService.uploadImage(any(), any())).thenReturn("https://cdn.example.com/cover.jpg");

        // When (@Async는 단위 테스트에서 동기 실행됨 — Spring 컨텍스트 없이 직접 호출)
        bookGenerationTask.run(BOOK_ID, KEYWORDS, GENRE, "WARM", "HAPPY", null, null, "3인칭");

        // Then: 텍스트 완료 시 GENERATING, 이후 DONE 순서로 호출됨
        InOrder inOrder = inOrder(bookRepository);
        inOrder.verify(bookRepository)
                .updateGenerationResult(BOOK_ID, "우주 고양이", "소설 본문...", BookStatus.GENERATING);
        inOrder.verify(bookRepository).updateStatus(BOOK_ID, BookStatus.DONE);
        verify(bookRepository, never()).updateStatus(BOOK_ID, BookStatus.FAILED);
    }

    @Test
    @DisplayName("이미지 생성 서비스가 null을 반환해도 최종 상태는 DONE")
    void generateBook_이미지_생성_실패해도_DONE_전환() {
        // Given
        String[] geminiResult = {"제목", "본문"};
        Book mockBook = Book.builder().id(BOOK_ID).publishedBy(10L).genre(GENRE).build();

        when(openAiService.generate(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(geminiResult);
        when(bookRepository.findById(BOOK_ID)).thenReturn(Optional.of(mockBook));
        when(imagenService.generateCoverImage(any(), any(), any())).thenReturn(null); // 이미지 null 반환

        // When
        bookGenerationTask.run(BOOK_ID, KEYWORDS, GENRE, "WARM", "HAPPY", null, null, "3인칭");

        // Then: 이미지 실패해도 DONE, FAILED 전환 없음
        verify(bookRepository).updateStatus(BOOK_ID, BookStatus.DONE);
        verify(bookRepository, never()).updateStatus(BOOK_ID, BookStatus.FAILED);
    }

    @Test
    @DisplayName("Gemini API 예외 발생 시 BookStatus.FAILED로 전환")
    void generateBook_Gemini_실패_시_FAILED_전환() {
        // Given: Gemini API가 RuntimeException 던짐
        when(openAiService.generate(any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Gemini 서버 오류"));

        // When
        bookGenerationTask.run(BOOK_ID, KEYWORDS, GENRE, "WARM", "HAPPY", null, null, "3인칭");

        // Then: FAILED 상태로 변경, DONE 전환 없음
        verify(bookRepository).updateStatus(BOOK_ID, BookStatus.FAILED);
        verify(bookRepository, never()).updateStatus(BOOK_ID, BookStatus.DONE);
    }
}
