package com.remon.book.controller;

import com.remon.book.dto.BookResponse;
import com.remon.book.service.BookService;
import com.remon.config.SecurityConfig;
import com.remon.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookController.class)
@Import(SecurityConfig.class)
class BookControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private BookService bookService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private static final String BOOK_JSON = """
            {"title":"t","author":"a","isbn":"1","publishedDate":"2026-01-01","price":0,"description":"d"}
            """;

    @Test
    @DisplayName("비로그인 GET /api/books/my → 401 (기존: permitAll 매칭으로 NPE 500)")
    void myBooks_비로그인_401() throws Exception {
        mockMvc.perform(get("/api/books/my"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("비로그인 GET /api/books/feed → 401")
    void feed_비로그인_401() throws Exception {
        mockMvc.perform(get("/api/books/feed"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    @DisplayName("로그인 사용자 GET /api/books/my → 200")
    void myBooks_로그인_200() throws Exception {
        when(bookService.getMyBooks("user@test.com")).thenReturn(List.of());
        mockMvc.perform(get("/api/books/my"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비로그인 GET /api/books/{id} 상세 조회는 계속 허용")
    void bookDetail_비로그인_허용() throws Exception {
        when(bookService.getBookById(1L)).thenReturn(BookResponse.builder().id(1L).build());
        mockMvc.perform(get("/api/books/1"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("일반 사용자 POST /api/books → 403")
    void createBook_일반사용자_403() throws Exception {
        mockMvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content(BOOK_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("관리자 POST /api/books → 200")
    void createBook_관리자_허용() throws Exception {
        when(bookService.createBook(any())).thenReturn(BookResponse.builder().id(1L).build());
        mockMvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content(BOOK_JSON))
                .andExpect(status().isOk());
    }
}
