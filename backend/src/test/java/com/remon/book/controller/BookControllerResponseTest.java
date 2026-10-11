package com.remon.book.controller;

import com.remon.book.dto.BookCursorResponse;
import com.remon.book.dto.BookStatusResponse;
import com.remon.book.dto.BookSummaryResponse;
import com.remon.book.service.BookService;
import com.remon.config.SecurityConfig;
import com.remon.exception.BookNotFoundException;
import com.remon.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Map → record 전환 후에도 클라이언트가 읽는 JSON 키가 그대로인지 확인한다.
 */
@WebMvcTest(BookController.class)
@Import(SecurityConfig.class)
class BookControllerResponseTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private BookService bookService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    @WithMockUser
    @DisplayName("GET /api/books/{id}/status → { status, step }")
    void status_응답_키() throws Exception {
        when(bookService.getBookStatus(1L)).thenReturn(new BookStatusResponse("GENERATING", "IMAGE"));

        mockMvc.perform(get("/api/books/1/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GENERATING"))
                .andExpect(jsonPath("$.step").value("IMAGE"));
    }

    @Test
    @DisplayName("GET /api/books/cursor → { books, nextCursor, hasMore }, 목록에는 content 없음, aiGenerated 키 유지")
    void cursor_응답_키() throws Exception {
        BookSummaryResponse book = BookSummaryResponse.builder().id(5L).title("t").isAiGenerated(true).build();
        when(bookService.getBooksCursor(any(), any(), anyInt(), any()))
                .thenReturn(new BookCursorResponse(List.of(book), 5L, true));

        mockMvc.perform(get("/api/books/cursor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.books[0].id").value(5))
                .andExpect(jsonPath("$.books[0].aiGenerated").value(true))
                .andExpect(jsonPath("$.books[0].content").doesNotExist())
                .andExpect(jsonPath("$.nextCursor").value(5))
                .andExpect(jsonPath("$.hasMore").value(true));
    }

    @Test
    @DisplayName("없는 책 → 404 + { error, code: BOOK_NOT_FOUND }")
    void 없는_책_404() throws Exception {
        when(bookService.getBookById(99L)).thenThrow(new BookNotFoundException(99L));

        mockMvc.perform(get("/api/books/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("책을 찾을 수 없습니다. id=99"))
                .andExpect(jsonPath("$.code").value("BOOK_NOT_FOUND"));
    }
}
