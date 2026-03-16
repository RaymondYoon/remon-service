package com.remon.book.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class BookResponse {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publishedDate;
    private double price;
    private String description;

    // AI 생성 책 필드
    private String content;
    private boolean isAiGenerated;
    private String genre;
    private String tone;
}
