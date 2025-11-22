package com.remon.book.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BookRequest {
    private String title;
    private String author;
    private String isbn;
    private String publishedDate;
    private double price;
    private String description;
}
