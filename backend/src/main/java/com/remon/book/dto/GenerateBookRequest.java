package com.remon.book.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class GenerateBookRequest {
    private List<String> keywords;  // 예: ["우주", "고양이"]  최대 3개
    private String genre;           // "SF" | "판타지" | "로맨스" | "일상" | "공포"
    private String length;          // "SHORT"(~3000자) | "MEDIUM"(~8000자) | "LONG"(~15000자)
    private String tone;            // "WARM" | "DARK" | "HUMOROUS"
}
