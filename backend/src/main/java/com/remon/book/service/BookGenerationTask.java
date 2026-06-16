package com.remon.book.service;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import com.remon.notification.entity.NotificationType;
import com.remon.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class BookGenerationTask {

    private static final Logger log = LoggerFactory.getLogger(BookGenerationTask.class);

    private final BookRepository bookRepository;
    private final OpenAiService openAiService;
    private final ImagenService imagenService;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;
    private final CacheManager cacheManager;

    public BookGenerationTask(BookRepository bookRepository, OpenAiService openAiService,
                              ImagenService imagenService, CloudinaryService cloudinaryService,
                              NotificationService notificationService, CacheManager cacheManager) {
        this.bookRepository      = bookRepository;
        this.openAiService       = openAiService;
        this.imagenService       = imagenService;
        this.cloudinaryService   = cloudinaryService;
        this.notificationService = notificationService;
        this.cacheManager        = cacheManager;
    }

    @Async
    public void run(Long bookId, List<String> keywords, String genre, List<String> tone, String ending,
                    List<String> protagonistNames, List<String> protagonistTrait, String viewpoint,
                    String synopsis, List<String> characters) {
        bookRepository.updateStatus(bookId, BookStatus.GENERATING);
        log.info("책 생성 시작 - bookId: {}, keywords: {}, genre: {}, tone: {}, ending: {}",
                bookId, keywords, genre, tone, ending);
        try {
            String[] result = openAiService.generate(keywords, genre, tone, ending, protagonistNames, protagonistTrait, viewpoint, synopsis, characters);
            bookRepository.updateGenerationResult(bookId, result[0], result[1], BookStatus.GENERATING);
            log.info("텍스트 생성 완료 - bookId: {}, titleLength: {}, contentLength: {}",
                    bookId, result[0] != null ? result[0].length() : 0, result[1] != null ? result[1].length() : 0);

            Book book = bookRepository.findById(bookId).orElse(null);

            try {
                byte[] imageBytes = imagenService.generateCoverImage(result[0], genre, result[1]);
                if (imageBytes != null) {
                    String coverImageUrl = cloudinaryService.uploadImage(imageBytes, "book-" + bookId);
                    log.info("Cloudinary URL: {}", coverImageUrl);
                    if (coverImageUrl != null && book != null) {
                        book.setCoverImageUrl(coverImageUrl);
                        bookRepository.save(book);
                        log.info("저장된 coverImageUrl: {}", book.getCoverImageUrl());
                    }
                }
            } catch (Exception e) {
                log.warn("표지 이미지 생성/업로드 실패 (책은 DONE 유지) - bookId: {}, message: {}", bookId, e.getMessage());
            }

            // 이미지 처리 완료 후 DONE으로 변경
            bookRepository.updateStatus(bookId, BookStatus.DONE);
            log.info("책 생성 완료(DONE) - bookId: {}", bookId);

            // 새 책이 추가됐으므로 평점순/조회수순 캐시 무효화
            evictSortedBookCaches();

            // 책 생성 완료 알림 (이미지 처리 완료 후 발송)
            if (book != null && book.getPublishedBy() != null) {
                try {
                    notificationService.createBookNotification(
                            book.getPublishedBy(),
                            NotificationType.BOOK_GENERATED,
                            "이야기가 완성됐어요! 지금 바로 읽어보세요.",
                            bookId
                    );
                } catch (Exception e) {
                    log.warn("책 생성 알림 발송 실패 - bookId: {}, message: {}", bookId, e.getMessage());
                }
            }
        } catch (Exception e) {
            bookRepository.updateStatus(bookId, BookStatus.FAILED);
            log.error("책 생성 실패 - bookId: {}, message: {}", bookId, e.getMessage(), e);
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
                byte[] imageBytes = imagenService.generateCoverImage(book.getTitle(), book.getGenre(), book.getContent());
                if (imageBytes != null) {
                    String url = cloudinaryService.uploadImage(imageBytes, "book-" + book.getId());
                    if (url != null) {
                        book.setCoverImageUrl(url);
                        bookRepository.save(book);
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
