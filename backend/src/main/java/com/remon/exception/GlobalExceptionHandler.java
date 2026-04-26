package com.remon.exception;

import org.springframework.http.HttpStatus;
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
     * @Valid 검증 실패 (이메일 형식, 비밀번호 길이, 빈값 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fieldErrors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "유효하지 않은 값입니다.",
                        (existing, duplicate) -> existing
                ));
        return Map.of("error", "입력값 검증 실패", "fields", fieldErrors);
    }

    /**
     * 비즈니스 로직 오류 (이메일 중복, 잘못된 비밀번호 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleIllegalState(IllegalStateException e) {
        return Map.of("error", e.getMessage());
    }

    /**
     * 잘못된 요청 파라미터 (키워드 누락 등)
     * → 400 Bad Request
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleIllegalArgument(IllegalArgumentException e) {
        return Map.of("error", e.getMessage());
    }

    /**
     * 리소스 없음 (존재하지 않는 책 id 등)
     * → 404 Not Found
     */
    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleNoSuchElement(NoSuchElementException e) {
        return Map.of("error", e.getMessage());
    }
}
