package com.remon.book.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String coverImageUrl;
    private String fileurl;
    private double price;
    private String description;
    private LocalDate publishedDate;
    private Long publishedBy;

    // AI 생성 책을 위한 필드
    @Column(columnDefinition = "TEXT")
    private String content;         // AI가 생성한 본문

    @Builder.Default
    private boolean isAiGenerated = false;  // 수동 등록 기본값 false

    private String genre;           // 생성 시 사용한 장르 (예: SF, 판타지)
    private String tone;            // 생성 시 사용한 톤 (예: WARM, DARK)
}
