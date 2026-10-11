package com.remon.book.ai;

/**
 * 소설 텍스트 생성기. 구현체를 바꾸면 다른 LLM 으로 교체할 수 있다.
 */
public interface StoryTextGenerator {

    /**
     * @throws RuntimeException 생성·파싱 실패 시 (호출부가 FAILED + 레몬 환불 처리)
     */
    GeneratedStory generate(StoryPrompt prompt);
}
