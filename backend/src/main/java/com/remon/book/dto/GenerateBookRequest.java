package com.remon.book.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class GenerateBookRequest {

    @NotEmpty
    private List<String> keywords;  // 예: ["우주", "고양이"]  최대 4개

    @NotBlank
    private String genre;           // "SF" | "판타지" | "로맨스" | "일상" | "공포"

    @NotEmpty
    private List<String> tone;      // ["WARM", "DARK"] 최대 2개

    private String ending;          // "HAPPY" | "SAD" | "OPEN" (선택, 기본값 HAPPY)

    private String protagonistName;  // 주인공 이름 (선택, null이면 AI가 결정)

    private List<String> protagonistTrait; // 주인공 성격 특징 (선택, 최대 3개)

    private String viewpoint;        // 서술 시점 ("1인칭" | "3인칭", 기본값 "3인칭")

    private String synopsis;         // 한 줄 시놉시스 (선택)
}
