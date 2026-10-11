package com.remon.exception;

import org.springframework.http.HttpStatus;

/**
 * API 오류 코드. 응답 본문의 "code" 필드로 내려가며, 클라이언트는 메시지 대신 코드로 분기할 수 있다.
 */
public enum ErrorCode {

    // 도메인 오류
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    BOOK_NOT_FOUND(HttpStatus.NOT_FOUND, "책을 찾을 수 없습니다."),
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    LEMON_INSUFFICIENT(HttpStatus.BAD_REQUEST, "레몬이 부족합니다. 내일 다시 충전됩니다."),

    // 아직 전용 예외로 옮기지 않은 표준 예외용 코드
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "입력값 검증 실패"),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getStatus() { return status; }
    public String getDefaultMessage() { return defaultMessage; }
}
