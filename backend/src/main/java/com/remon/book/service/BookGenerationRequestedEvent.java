package com.remon.book.service;

/**
 * 책 생성 요청 이벤트. 트랜잭션 커밋 후(AFTER_COMMIT)에만 비동기 생성이 시작되도록
 * BookService 가 발행하고 BookGenerationTask 가 수신한다.
 */
public record BookGenerationRequestedEvent(Long bookId, StoryPrompt prompt) {
}
