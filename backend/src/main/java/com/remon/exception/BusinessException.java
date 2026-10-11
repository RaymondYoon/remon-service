package com.remon.exception;

/**
 * 도메인 규칙 위반 예외의 공통 부모. GlobalExceptionHandler 가 ErrorCode 의 상태 코드로 응답한다.
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getDefaultMessage());
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() { return errorCode; }
}
