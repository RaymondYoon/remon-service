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
    private List<String> keywords;  // 예: ["우주", "고양이"]  최대 3개

    @NotBlank
    private String genre;           // "SF" | "판타지" | "로맨스" | "일상" | "공포"

    @NotBlank
    private String length;          // "SHORT"(~3000자) | "MEDIUM"(~8000자) | "LONG"(~15000자)

    @NotBlank
    private String tone;            // "WARM" | "DARK" | "HUMOROUS"
}
