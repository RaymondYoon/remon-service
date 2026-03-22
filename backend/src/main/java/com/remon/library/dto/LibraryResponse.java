package com.remon.library.dto;

import com.remon.library.entity.ReadingStatus;
import com.remon.library.entity.UserBook;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class LibraryResponse {

    private Long id;
    private Long bookId;
    private String title;
    private String author;
    private String coverImageUrl;
    private String genre;
    private ReadingStatus status;
    private LocalDateTime savedAt;

    public static LibraryResponse from(UserBook userBook) {
        return LibraryResponse.builder()
                .id(userBook.getId())
                .bookId(userBook.getBook().getId())
                .title(userBook.getBook().getTitle())
                .author(userBook.getBook().getAuthor())
                .coverImageUrl(userBook.getBook().getCoverImageUrl())
                .genre(userBook.getBook().getGenre())
                .status(userBook.getStatus())
                .savedAt(userBook.getSavedAt())
                .build();
    }
}
