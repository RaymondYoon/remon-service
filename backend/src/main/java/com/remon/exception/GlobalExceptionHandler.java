package com.remon.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 도메인 예외 → ErrorCode 에 정의된 상태 코드
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        ErrorCode code = e.getErrorCode();
        return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, e.getMessage()));
    }

    /**
     * @Valid 검증 실패 (이메일 형식, 비밀번호 길이, 빈값 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fieldErrors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "유효하지 않은 값입니다.",
                        (existing, duplicate) -> existing
                ));
        ErrorCode code = ErrorCode.VALIDATION_FAILED;
        return new ErrorResponse(code.getDefaultMessage(), code.name(), fieldErrors);
    }

    /**
     * 비즈니스 로직 오류 (이메일 중복, 잘못된 비밀번호 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalState(IllegalStateException e) {
        return ErrorResponse.of(ErrorCode.INVALID_REQUEST, e.getMessage());
    }

    /**
     * 잘못된 요청 파라미터 (키워드 누락 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgument(IllegalArgumentException e) {
        return ErrorResponse.of(ErrorCode.INVALID_REQUEST, e.getMessage());
    }

    /**
     * 리소스 없음
     * → 404 Not Found
     */
    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNoSuchElement(NoSuchElementException e) {
        return ErrorResponse.of(ErrorCode.NOT_FOUND, e.getMessage());
    }
}
