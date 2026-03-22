package com.remon.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LibraryRequest {

    @NotNull
    private Long bookId;
}
