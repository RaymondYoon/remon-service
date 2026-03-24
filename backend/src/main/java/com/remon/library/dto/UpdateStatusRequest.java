package com.remon.library.dto;

import com.remon.library.entity.ReadingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateStatusRequest {

    @NotNull
    private ReadingStatus status;
}
