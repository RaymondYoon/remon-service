package com.remon.book.service;

import com.remon.book.dto.BookRequest;
import com.remon.book.dto.BookResponse;
import com.remon.book.entity.Book;
import com.remon.book.repository.BookRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookService {
    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    public BookResponse createBook(BookRequest request){
        Book book = Book.builder()
                .title(request.getTitle())
                .author(request.getAuthor())
                .isbn(request.getIsbn())
                .publishedDate(LocalDate.parse(request.getPublishedDate()))
                .price(request.getPrice())
                .description(request.getDescription())
                .build();
        Book savedBook = bookRepository.save(book);
        return mapToResponse(savedBook);
    }

    public List<BookResponse> getAllBooks() {
        return bookRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    private BookResponse mapToResponse(Book book) {
        return BookResponse.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getTitle())
                .isbn(book.getIsbn())
                .publishedDate(book.getPublishedDate().toString())
                .price(book.getPrice())
                .description(book.getDescription())
                .build();
    }
}
