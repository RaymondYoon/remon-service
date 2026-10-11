package com.remon.book.ai;

/**
 * 책 표지 이미지 생성기.
 */
public interface CoverImageGenerator {

    /**
     * @return 이미지 바이트, 생성 실패 시 null (표지는 부가 기능이라 실패해도 책 생성은 계속된다)
     */
    byte[] generateCoverImage(String title, String genre, String content);
}
