package com.remon.book.service;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookGenerationTask {

    private static final Logger log = LoggerFactory.getLogger(BookGenerationTask.class);

    private final BookRepository bookRepository;
    private final OpenAiService openAiService;
    private final ImagenService imagenService;
    private final CloudinaryService cloudinaryService;

    public BookGenerationTask(BookRepository bookRepository, OpenAiService openAiService,
                              ImagenService imagenService, CloudinaryService cloudinaryService) {
        this.bookRepository     = bookRepository;
        this.openAiService      = openAiService;
        this.imagenService      = imagenService;
        this.cloudinaryService  = cloudinaryService;
    }

    @Async
    public void run(Long bookId, List<String> keywords, String genre, String tone, String ending, String protagonistName) {
        bookRepository.updateStatus(bookId, BookStatus.GENERATING);
        log.info("책 생성 시작 - bookId: {}, keywords: {}, genre: {}, tone: {}, ending: {}",
                bookId, keywords, genre, tone, ending);
        try {
            String[] result = openAiService.generate(keywords, genre, tone, ending, protagonistName);
            bookRepository.updateGenerationResult(bookId, result[0], result[1], BookStatus.DONE);
            log.info("책 생성 완료 - bookId: {}, titleLength: {}, contentLength: {}",
                    bookId, result[0] != null ? result[0].length() : 0, result[1] != null ? result[1].length() : 0);

            try {
                byte[] imageBytes = imagenService.generateCoverImage(result[0], genre);
                if (imageBytes != null) {
                    String coverImageUrl = cloudinaryService.uploadImage(imageBytes, "book-" + bookId);
                    log.info("Cloudinary URL: {}", coverImageUrl);
                    if (coverImageUrl != null) {
                        Book book = bookRepository.findById(bookId).orElse(null);
                        if (book != null) {
                            book.setCoverImageUrl(coverImageUrl);
                            bookRepository.save(book);
                            log.info("저장된 coverImageUrl: {}", book.getCoverImageUrl());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("표지 이미지 생성/업로드 실패 (책은 DONE 유지) - bookId: {}, message: {}", bookId, e.getMessage());
            }
        } catch (Exception e) {
            bookRepository.updateStatus(bookId, BookStatus.FAILED);
            log.error("책 생성 실패 - bookId: {}, message: {}", bookId, e.getMessage(), e);
        }
    }
}
