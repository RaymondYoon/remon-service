package com.remon.book.dto;

/**
 * 생성 상태 폴링 응답.
 * @param status PENDING | GENERATING | DONE | FAILED
 * @param step   TEXT | IMAGE | DONE | FAILED (진행도 표시용)
 */
public record BookStatusResponse(String status, String step) {
}
