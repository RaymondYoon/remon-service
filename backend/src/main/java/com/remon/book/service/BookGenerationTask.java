package com.remon.book.service;

import com.remon.book.entity.BookStatus;
import com.remon.book.repository.BookRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookGenerationTask {

    private final BookRepository bookRepository;
    private final OpenAiService openAiService;

    public BookGenerationTask(BookRepository bookRepository, OpenAiService openAiService) {
        this.bookRepository = bookRepository;
        this.openAiService  = openAiService;
    }

    @Async
    public void run(Long bookId, List<String> keywords, String genre, String tone, String ending, String protagonistName) {
        bookRepository.updateStatus(bookId, BookStatus.GENERATING);
        try {
            String[] result = openAiService.generate(keywords, genre, tone, ending, protagonistName);
            bookRepository.updateGenerationResult(bookId, result[0], result[1], BookStatus.DONE);
        } catch (Exception e) {
            bookRepository.updateStatus(bookId, BookStatus.FAILED);
        }
    }
}
