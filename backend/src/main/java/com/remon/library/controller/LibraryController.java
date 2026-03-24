package com.remon.library.controller;

import com.remon.library.dto.LibraryRequest;
import com.remon.library.dto.LibraryResponse;
import com.remon.library.dto.UpdateStatusRequest;
import com.remon.library.service.LibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LibraryResponse addToLibrary(
            @Valid @RequestBody LibraryRequest request,
            Authentication authentication
    ) {
        return libraryService.addToLibrary(authentication.getName(), request);
    }

    @GetMapping
    public List<LibraryResponse> getMyLibrary(Authentication authentication) {
        return libraryService.getMyLibrary(authentication.getName());
    }

    @PatchMapping("/{bookId}/status")
    public LibraryResponse updateStatus(
            @PathVariable Long bookId,
            @Valid @RequestBody UpdateStatusRequest request,
            Authentication authentication
    ) {
        return libraryService.updateStatus(authentication.getName(), bookId, request);
    }

    @PatchMapping("/{bookId}/start-reading")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void startReading(
            @PathVariable Long bookId,
            Authentication authentication
    ) {
        libraryService.startReading(authentication.getName(), bookId);
    }

    @DeleteMapping("/{bookId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFromLibrary(
            @PathVariable Long bookId,
            Authentication authentication
    ) {
        libraryService.deleteFromLibrary(authentication.getName(), bookId);
    }
}
