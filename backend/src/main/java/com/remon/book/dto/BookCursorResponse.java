package com.remon.book.dto;

import java.util.List;

/**
 * 커서 기반 목록 응답. 평점순/조회수순은 nextCursor=null, hasMore=false.
 */
public record BookCursorResponse(List<BookSummaryResponse> books, Long nextCursor, boolean hasMore) {
}
