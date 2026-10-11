package com.remon.book.ai;

/**
 * AI 가 생성한 소설 (제목 + 본문).
 */
public record GeneratedStory(String title, String content) {
}
