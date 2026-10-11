package com.remon.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * 오류 응답 본문. 기존 클라이언트가 읽는 "error" 키는 유지하고 "code" 를 추가했다.
 * fields 는 @Valid 검증 실패 시에만 포함된다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String error, String code, Map<String, String> fields) {

    public static ErrorResponse of(ErrorCode code, String message) {
        return new ErrorResponse(message, code.name(), null);
    }
}
