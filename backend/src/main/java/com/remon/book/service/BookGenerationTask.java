package com.remon.book.service;

import com.remon.book.ai.CoverImageGenerator;
import com.remon.book.ai.GeneratedStory;
import com.remon.book.ai.StoryPrompt;
import com.remon.book.ai.StoryTextGenerator;
import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.config.AsyncConfig;
import com.remon.notification.entity.NotificationType;
import com.remon.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class BookGenerationTask {

    private static final Logger log = LoggerFactory.getLogger(BookGenerationTask.class);

    private final BookRepository bookRepository;
    private final StoryTextGenerator textGenerator;
    private final CoverImageGenerator coverImageGenerator;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;
    private final CacheManager cacheManager;
    private final BookGenerationFailureService failureService;
    private final TaskExecutor executor;

    public BookGenerationTask(BookRepository bookRepository, StoryTextGenerator textGenerator,
                              CoverImageGenerator coverImageGenerator, CloudinaryService cloudinaryService,
                              NotificationService notificationService, CacheManager cacheManager,
                              BookGenerationFailureService failureService,
                              @Qualifier(AsyncConfig.BOOK_GENERATION_EXECUTOR) TaskExecutor executor) {
        this.bookRepository      = bookRepository;
        this.textGenerator       = textGenerator;
        this.coverImageGenerator = coverImageGenerator;
        this.cloudinaryService   = cloudinaryService;
        this.notificationService = notificationService;
        this.cacheManager        = cacheManager;
        this.failureService      = failureService;
        this.executor            = executor;
    }

    /**
     * 책 저장 트랜잭션이 커밋된 뒤에만 생성 작업을 큐에 넣는다.
     * (커밋 전에 비동기 스레드가 시작되면 아직 보이지 않는 행을 업데이트해 상태가 꼬인다)
     * 작업 큐가 가득 차 거절되면 즉시 FAILED + 레몬 환불.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onGenerationRequested(BookGenerationRequestedEvent event) {
        try {
            executor.execute(() -> run(event.bookId(), event.prompt()));
        } catch (TaskRejectedException e) {
            log.warn("생성 작업 큐 포화로 거절 - bookId: {}", event.bookId());
            failureService.failAndRefund(event.bookId());
        }
    }

    /**
     * 상태 흐름: PENDING → GENERATING(텍스트) → GENERATING(이미지) → DONE / 실패 시 FAILED + 레몬 환불.
     * 모든 상태 변경은 조건부 UPDATE 라서, 그 사이 복구 작업이 FAILED 처리했거나 책이 삭제됐다면
     * 결과를 덮어쓰지 않고 조용히 종료한다.
     */
    public void run(Long bookId, StoryPrompt prompt) {
        if (bookRepository.transitionStatus(bookId, List.of(BookStatus.PENDING), BookStatus.GENERATING) == 0) {
            log.warn("PENDING 상태가 아니어서 생성을 건너뜀 (삭제/복구됨) - bookId: {}", bookId);
            return;
        }
        log.info("책 생성 시작 - bookId: {}, keywords: {}, genre: {}, tone: {}, ending: {}",
                bookId, prompt.keywords(), prompt.genre(), prompt.tones(), prompt.ending());
        try {
            GeneratedStory story = textGenerator.generate(prompt);
            String title = story.title();
            String content = story.content();
            if (bookRepository.saveGeneratedText(bookId, title, content) == 0) {
                log.warn("텍스트 생성 후 상태가 바뀌어 결과를 버림 - bookId: {}", bookId);
                return;
            }
            log.info("텍스트 생성 완료 - bookId: {}, titleLength: {}, contentLength: {}",
                    bookId, title != null ? title.length() : 0, content != null ? content.length() : 0);

            saveCoverImage(bookId, title, prompt.genre(), content);

            // 이미지 처리 완료 후 DONE으로 변경 (그 사이 FAILED 처리됐다면 되살리지 않음)
            if (bookRepository.transitionStatus(bookId, List.of(BookStatus.GENERATING), BookStatus.DONE) == 0) {
                log.warn("DONE 전환 실패 — 이미 다른 상태로 변경됨 - bookId: {}", bookId);
                return;
            }
            log.info("책 생성 완료(DONE) - bookId: {}", bookId);

            // 새 책이 추가됐으므로 평점순/조회수순 캐시 무효화
            evictSortedBookCaches();
            sendGeneratedNotification(bookId);
        } catch (Exception e) {
            log.error("책 생성 실패 - bookId: {}, message: {}", bookId, e.getMessage(), e);
            try {
                failureService.failAndRefund(bookId);
            } catch (Exception refundError) {
                // 여기서도 실패하면 StaleGenerationRecoveryJob 이 나중에 다시 처리한다
                log.error("실패 처리/환불 중 오류 - bookId: {}", bookId, refundError);
            }
        }
    }

    private void saveCoverImage(Long bookId, String title, String genre, String content) {
        try {
            byte[] imageBytes = coverImageGenerator.generateCoverImage(title, genre, content);
            if (imageBytes == null) return;
            String coverImageUrl = cloudinaryService.uploadImage(imageBytes, "book-" + bookId);
            if (coverImageUrl != null) {
                bookRepository.updateCoverImageUrl(bookId, coverImageUrl);
                log.info("표지 저장 완료 - bookId: {}, url: {}", bookId, coverImageUrl);
            }
        } catch (Exception e) {
            log.warn("표지 이미지 생성/업로드 실패 (책은 DONE 유지) - bookId: {}, message: {}", bookId, e.getMessage());
        }
    }

    private void sendGeneratedNotification(Long bookId) {
        Long publisherId = bookRepository.findPublisherId(bookId).orElse(null);
        if (publisherId == null) return;
        try {
            notificationService.createBookNotification(
                    publisherId,
                    NotificationType.BOOK_GENERATED,
                    "이야기가 완성됐어요! 지금 바로 읽어보세요.",
                    bookId
            );
        } catch (Exception e) {
            log.warn("책 생성 알림 발송 실패 - bookId: {}, message: {}", bookId, e.getMessage());
        }
    }

    private void evictSortedBookCaches() {
        Cache rating = cacheManager.getCache("books-rating");
        Cache views  = cacheManager.getCache("books-views");
        if (rating != null) rating.clear();
        if (views  != null) views.clear();
        log.info("books-rating / books-views 캐시 무효화 완료");
    }

    @Async
    public void generateMissingCoversAsync() {
        List<Book> books = bookRepository.findByStatusAndNoCover(BookStatus.DONE);
        log.info("표지 일괄 생성 시작 - 대상 책 수: {}", books.size());
        AtomicInteger success = new AtomicInteger(0);
        AtomicInteger failed = new AtomicInteger(0);
        for (Book book : books) {
            try {
                byte[] imageBytes = coverImageGenerator.generateCoverImage(book.getTitle(), book.getGenre(), book.getContent());
                if (imageBytes != null) {
                    String url = cloudinaryService.uploadImage(imageBytes, "book-" + book.getId());
                    if (url != null) {
                        bookRepository.updateCoverImageUrl(book.getId(), url);
                        log.info("표지 생성 완료 - bookId: {}, url: {}", book.getId(), url);
                        success.incrementAndGet();
                        continue;
                    }
                }
                log.warn("표지 생성 실패 - bookId: {}", book.getId());
                failed.incrementAndGet();
            } catch (Exception e) {
                log.warn("표지 생성 오류 - bookId: {}, message: {}", book.getId(), e.getMessage());
                failed.incrementAndGet();
            }
        }
        log.info("표지 일괄 생성 완료 - total: {}, success: {}, failed: {}",
                books.size(), success.get(), failed.get());
    }
}
