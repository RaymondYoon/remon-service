package com.remon.book.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "book")
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
    @Setter
    @Column(columnDefinition = "TEXT")
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

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BookStatus status = BookStatus.DONE;

    @Builder.Default
    private boolean isPublic = true;

    @Builder.Default
    @Column(columnDefinition = "bigint default 0")
    private Long viewCount = 0L;

    // 생성 요청 시각 — 오래 멈춘 PENDING/GENERATING 복구 기준
    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // 생성 실패 시 레몬 환불 여부 — 중복 환불 방지 플래그
    @Builder.Default
    @Column(name = "lemon_refunded", nullable = false)
    private boolean lemonRefunded = false;
}
