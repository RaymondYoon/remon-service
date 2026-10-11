package com.remon.book.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 목록용 책 응답 — 본문(content)을 제외해 목록 응답 크기를 줄인다.
 * 본문이 필요한 상세/읽기 화면은 GET /api/books/{id} 의 BookResponse 를 사용한다.
 * (JSON 필드명은 BookResponse 와 동일하게 유지)
 */
@Getter
@Builder
@AllArgsConstructor
public class BookSummaryResponse {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String coverImageUrl;
    private String publishedDate;
    private double price;
    private String description;

    private boolean isAiGenerated;
    private String genre;
    private String tone;
    private String status;

    private boolean isPublic;
    private Long publishedBy;
    private String authorNickname;
    private Double averageRating;
    private Long viewCount;
}
