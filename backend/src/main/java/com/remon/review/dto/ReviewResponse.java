package com.remon.review.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long bookId;
    private Long userId;
    private String nickname;
    private int rating;
    private String content;
    private String createdAt;
}
