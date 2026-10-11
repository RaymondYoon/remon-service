package com.remon.book.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinaryServiceTest {

    @Test
    @DisplayName("전달 URL에서 버전·확장자를 뺀 public id 를 추출한다")
    void extractPublicId() {
        assertThat(CloudinaryService.extractPublicId(
                "https://res.cloudinary.com/demo/image/upload/v1712345678/remon-covers/book-1.png"))
                .isEqualTo("remon-covers/book-1");
        assertThat(CloudinaryService.extractPublicId(
                "https://res.cloudinary.com/demo/image/upload/book-2.jpg"))
                .isEqualTo("book-2");
    }

    @Test
    @DisplayName("Cloudinary URL 이 아니면 null")
    void extractPublicId_잘못된_URL() {
        assertThat(CloudinaryService.extractPublicId(null)).isNull();
        assertThat(CloudinaryService.extractPublicId("https://example.com/a.png")).isNull();
    }
}
