package com.remon.logging;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Pattern;

/**
 * Logback 커스텀 컨버터 - 로그 메시지에서 민감 정보를 자동 마스킹합니다.
 *
 * 마스킹 대상:
 *  - 이메일: abc***@example.com
 *  - JWT Bearer 토큰: 앞 10자 + ***
 *  - password 필드 값: ***
 */
public class MaskingMessageConverter extends MessageConverter {

    // 이메일: 로컬파트 앞 3자만 남기고 마스킹
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("([a-zA-Z0-9._%+\\-]{1,3})[a-zA-Z0-9._%+\\-]*(@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})");

    // JWT Bearer 토큰 (Header 형식 또는 단독 토큰)
    private static final Pattern JWT_BEARER_PATTERN =
            Pattern.compile("(Bearer\\s+[A-Za-z0-9\\-_]{10})[A-Za-z0-9\\-_.]+");

    // 단독 JWT (eyJ로 시작하는 토큰)
    private static final Pattern JWT_RAW_PATTERN =
            Pattern.compile("(eyJ[A-Za-z0-9\\-_]{7})[A-Za-z0-9\\-_.]+");

    // JSON/로그에서 password 필드 값
    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("(\"password\"\\s*:\\s*\")([^\"]*)(\")", Pattern.CASE_INSENSITIVE);

    @Override
    public String convert(ILoggingEvent event) {
        String message = super.convert(event);
        if (message == null) return null;

        message = EMAIL_PATTERN.matcher(message).replaceAll("$1***$2");
        message = JWT_BEARER_PATTERN.matcher(message).replaceAll("$1***");
        message = JWT_RAW_PATTERN.matcher(message).replaceAll("$1***");
        message = PASSWORD_PATTERN.matcher(message).replaceAll("$1***$3");

        return message;
    }
}
