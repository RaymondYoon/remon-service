package com.remon.book.ai;

import com.remon.book.dto.GenerateBookRequest;

import java.util.List;

/**
 * 소설 생성에 필요한 입력값 묶음.
 * 비동기 작업으로 넘어가므로 요청 DTO 대신 불변 값 객체로 전달한다.
 */
public record StoryPrompt(
        List<String> keywords,
        String genre,
        List<String> tones,
        String ending,
        List<String> protagonistNames,
        List<String> protagonistTraits,
        String viewpoint,
        String synopsis,
        List<String> characters
) {
    public StoryPrompt {
        keywords          = copyOrEmpty(keywords);
        tones             = copyOrEmpty(tones);
        protagonistNames  = copyOrEmpty(protagonistNames);
        protagonistTraits = copyOrEmpty(protagonistTraits);
        characters        = copyOrEmpty(characters);
    }

    public static StoryPrompt from(GenerateBookRequest request) {
        return new StoryPrompt(
                request.getKeywords(),
                request.getGenre(),
                request.getTone(),
                request.getEnding(),
                request.getProtagonistNames(),
                request.getProtagonistTrait(),
                request.getViewpoint(),
                request.getSynopsis(),
                request.getCharacters()
        );
    }

    private static List<String> copyOrEmpty(List<String> list) {
        // List.copyOf 는 null 원소를 허용하지 않으므로 null 원소는 미리 제거
        return list == null ? List.of() : list.stream().filter(v -> v != null).toList();
    }
}
