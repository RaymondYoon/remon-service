package com.remon.logging;

/**
 * 로그 출력 시 민감 정보를 수동으로 마스킹하는 유틸리티.
 * MaskingMessageConverter가 자동으로 처리하지 못하는 경우에 사용합니다.
 */
public final class MaskingUtil {

    private MaskingUtil() {}

    /**
     * 이메일 마스킹: abc***@example.com
     * 로컬파트가 3자 미만이면 전부 마스킹.
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIdx = email.indexOf('@');
        String local = email.substring(0, atIdx);
        String domain = email.substring(atIdx);
        if (local.length() <= 3) {
            return "***" + domain;
        }
        return local.substring(0, 3) + "***" + domain;
    }

    /**
     * JWT 토큰 마스킹: 앞 10자리만 표시 후 ***
     */
    public static String maskToken(String token) {
        if (token == null || token.length() <= 10) return "***";
        return token.substring(0, 10) + "***";
    }
}
