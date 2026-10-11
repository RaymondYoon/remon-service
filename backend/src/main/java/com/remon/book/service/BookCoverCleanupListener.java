package com.remon.book.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 책 삭제가 커밋된 뒤에만 Cloudinary 표지를 지운다.
 * (DB 삭제가 롤백됐는데 이미지만 사라지는 상황 방지. 이미지 삭제 실패는 로그만 남긴다)
 */
@Component
public class BookCoverCleanupListener {

    private final CloudinaryService cloudinaryService;

    public BookCoverCleanupListener(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookDeleted(BookDeletedEvent event) {
        if (event.coverImageUrl() != null && !event.coverImageUrl().isBlank()) {
            cloudinaryService.deleteImageByUrl(event.coverImageUrl());
        }
    }
}
