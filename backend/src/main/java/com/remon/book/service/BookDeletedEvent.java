package com.remon.book.service;

/**
 * 책 삭제 이벤트 — DB 삭제가 커밋된 뒤 외부 리소스(Cloudinary 표지)를 정리하기 위해 발행한다.
 */
public record BookDeletedEvent(Long bookId, String coverImageUrl) {
}
