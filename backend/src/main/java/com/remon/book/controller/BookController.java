package com.remon.book.controller;
//녹원 아파트?
import com.remon.book.dto.BookRequest;
import com.remon.book.dto.BookResponse;
import com.remon.book.dto.GenerateBookRequest;
import com.remon.book.service.BookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/books")
public class BookController {
    private final BookService bookService;

    public BookController(BookService bookService){
        this.bookService = bookService;
    }

    @PostMapping
    public BookResponse createBook(@Valid @RequestBody BookRequest request){
        return bookService.createBook(request);
    }

    @GetMapping
    public List<BookResponse> getAllBooks(
            @RequestParam(required = false) String keyword) {
        return bookService.getAllBooks(keyword);
    }

    @GetMapping("/my")
    public List<BookResponse> getMyBooks(Authentication authentication) {
        return bookService.getMyBooks(authentication.getName());
    }

    @GetMapping("/{id}")
    public BookResponse getBookById(@PathVariable Long id) {
        return bookService.getBookById(id);
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public BookResponse generateBook(@Valid @RequestBody GenerateBookRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return bookService.generateBook(request, email);
    }

    @GetMapping("/{id}/status")
    public Map<String, String> getBookStatus(@PathVariable Long id) {
        return Map.of("status", bookService.getBookStatus(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyBook(@PathVariable Long id, Authentication authentication) {
        bookService.deleteMyBook(authentication.getName(), id);
    }
}
