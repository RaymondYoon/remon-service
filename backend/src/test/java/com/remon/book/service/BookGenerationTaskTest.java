package com.remon.book.service;

import com.remon.book.ai.CoverImageGenerator;
import com.remon.book.ai.GeneratedStory;
import com.remon.book.ai.StoryPrompt;
import com.remon.book.ai.StoryTextGenerator;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.notification.entity.NotificationType;
import com.remon.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookGenerationTaskTest {

    @Mock private BookRepository bookRepository;
    @Mock private StoryTextGenerator textGenerator;
    @Mock private CoverImageGenerator coverImageGenerator;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private NotificationService notificationService;
    @Mock private CacheManager cacheManager;
    @Mock private Cache cache;
    @Mock private BookGenerationFailureService failureService;

    private BookGenerationTask bookGenerationTask;

    private static final Long BOOK_ID = 1L;
    private static final Long USER_ID = 10L;
    private static final StoryPrompt PROMPT = new StoryPrompt(
            List.of("우주", "고양이"), "SF", List.of("WARM"), "HAPPY",
            null, null, "3인칭", null, null);

    @BeforeEach
    void setUp() {
        bookGenerationTask = newTask(new SyncTaskExecutor());
        lenient().when(cacheManager.getCache(anyString())).thenReturn(cache);
    }

    private BookGenerationTask newTask(TaskExecutor executor) {
        return new BookGenerationTask(
                bookRepository, textGenerator, coverImageGenerator, cloudinaryService,
                notificationService, cacheManager, failureService, executor);
    }

    private void givenTransitionsSucceed() {
        when(bookRepository.transitionStatus(eq(BOOK_ID), any(), any())).thenReturn(1);
    }

    @Test
    @DisplayName("성공: PENDING→GENERATING → 텍스트 저장 → 표지 저장 → DONE 순서로 진행하고 알림 발송")
    void run_성공_상태_전이_순서() {
        givenTransitionsSucceed();
        when(textGenerator.generate(PROMPT)).thenReturn(new GeneratedStory("우주 고양이", "소설 본문..."));
        when(bookRepository.saveGeneratedText(BOOK_ID, "우주 고양이", "소설 본문...")).thenReturn(1);
        when(coverImageGenerator.generateCoverImage(any(), any(), any())).thenReturn(new byte[]{1, 2, 3});
        when(cloudinaryService.uploadImage(any(), any())).thenReturn("https://cdn.example.com/cover.jpg");
        when(bookRepository.findPublisherId(BOOK_ID)).thenReturn(Optional.of(USER_ID));

        bookGenerationTask.run(BOOK_ID, PROMPT);

        InOrder inOrder = inOrder(bookRepository);
        inOrder.verify(bookRepository).transitionStatus(BOOK_ID, List.of(BookStatus.PENDING), BookStatus.GENERATING);
        inOrder.verify(bookRepository).saveGeneratedText(BOOK_ID, "우주 고양이", "소설 본문...");
        inOrder.verify(bookRepository).updateCoverImageUrl(BOOK_ID, "https://cdn.example.com/cover.jpg");
        inOrder.verify(bookRepository).transitionStatus(BOOK_ID, List.of(BookStatus.GENERATING), BookStatus.DONE);
        verify(notificationService).createBookNotification(eq(USER_ID), eq(NotificationType.BOOK_GENERATED), anyString(), eq(BOOK_ID));
        verifyNoInteractions(failureService);
    }

    @Test
    @DisplayName("표지 생성이 null을 반환해도 최종 상태는 DONE, 환불 없음")
    void run_표지_실패해도_DONE() {
        givenTransitionsSucceed();
        when(textGenerator.generate(PROMPT)).thenReturn(new GeneratedStory("제목", "본문"));
        when(bookRepository.saveGeneratedText(BOOK_ID, "제목", "본문")).thenReturn(1);
        when(coverImageGenerator.generateCoverImage(any(), any(), any())).thenReturn(null);

        bookGenerationTask.run(BOOK_ID, PROMPT);

        verify(bookRepository).transitionStatus(BOOK_ID, List.of(BookStatus.GENERATING), BookStatus.DONE);
        verify(bookRepository, never()).updateCoverImageUrl(anyLong(), any());
        verifyNoInteractions(failureService);
    }

    @Test
    @DisplayName("Gemini 예외 발생 시 FAILED 전환 + 레몬 환불 위임, DONE 전환 없음")
    void run_Gemini_실패_시_환불() {
        givenTransitionsSucceed();
        when(textGenerator.generate(PROMPT)).thenThrow(new RuntimeException("Gemini 서버 오류"));

        bookGenerationTask.run(BOOK_ID, PROMPT);

        verify(failureService).failAndRefund(BOOK_ID);
        verify(bookRepository, never()).transitionStatus(BOOK_ID, List.of(BookStatus.GENERATING), BookStatus.DONE);
    }

    @Test
    @DisplayName("이미 PENDING이 아니면(복구 작업이 FAILED 처리/삭제됨) 생성을 시작하지 않는다")
    void run_PENDING_아니면_건너뜀() {
        when(bookRepository.transitionStatus(BOOK_ID, List.of(BookStatus.PENDING), BookStatus.GENERATING)).thenReturn(0);

        bookGenerationTask.run(BOOK_ID, PROMPT);

        verifyNoInteractions(textGenerator, failureService);
    }

    @Test
    @DisplayName("텍스트 생성 도중 FAILED 처리됐다면 결과를 저장하지 않고 DONE으로 되살리지 않는다")
    void run_생성_중_FAILED_처리되면_되살리지_않음() {
        when(bookRepository.transitionStatus(BOOK_ID, List.of(BookStatus.PENDING), BookStatus.GENERATING)).thenReturn(1);
        when(textGenerator.generate(PROMPT)).thenReturn(new GeneratedStory("제목", "본문"));
        when(bookRepository.saveGeneratedText(BOOK_ID, "제목", "본문")).thenReturn(0);

        bookGenerationTask.run(BOOK_ID, PROMPT);

        verify(bookRepository, never()).transitionStatus(BOOK_ID, List.of(BookStatus.GENERATING), BookStatus.DONE);
        verifyNoInteractions(coverImageGenerator, notificationService, failureService);
    }

    @Test
    @DisplayName("작업 큐가 가득 차 거절되면 즉시 FAILED + 환불")
    void onGenerationRequested_큐_거절_시_환불() {
        TaskExecutor rejecting = task -> { throw new TaskRejectedException("full"); };
        BookGenerationTask task = newTask(rejecting);

        task.onGenerationRequested(new BookGenerationRequestedEvent(BOOK_ID, PROMPT));

        verify(failureService).failAndRefund(BOOK_ID);
        verifyNoInteractions(textGenerator);
    }
}
