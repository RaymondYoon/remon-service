package com.remon.book.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BookRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String author;

    private String isbn;
    private String publishedDate;
    private double price;
    private String description;
}
