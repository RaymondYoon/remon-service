package com.remon.book.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.url}")
    private String apiUrl;

    public OpenAiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * OpenAI Chat Completions API 호출.
     * 프롬프트에서 {"title": "...", "content": "..."} JSON 형태로 응답받는다.
     *
     * @return 파싱된 결과 — result[0] = title, result[1] = content
     */
    public String[] generate(List<String> keywords, String genre, String length, String tone) {
        String systemPrompt = buildSystemPrompt();
        String userPrompt   = buildUserPrompt(keywords, genre, length, tone);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user",   "content", userPrompt)
                ),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 4096
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, request, String.class);

        return parseResponse(response.getBody());
    }

    // ── 프롬프트 ────────────────────────────────────────────────────────────

    private String buildSystemPrompt() {
        return """
                너는 한국어 단편 소설 작가다.
                반드시 아래 JSON 형식으로만 응답해라. 다른 텍스트는 포함하지 마라.
                {"title": "소설 제목", "content": "소설 본문 전체"}
                """;
    }

    private String buildUserPrompt(List<String> keywords, String genre, String length, String tone) {
        String lengthDesc = switch (length != null ? length.toUpperCase() : "SHORT") {
            case "MEDIUM" -> "8000자 내외";
            case "LONG"   -> "15000자 내외";
            default       -> "3000자 내외";
        };

        String toneDesc = switch (tone != null ? tone.toUpperCase() : "WARM") {
            case "DARK"      -> "어둡고 긴장감 있게";
            case "HUMOROUS"  -> "유쾌하고 재미있게";
            default          -> "따뜻하고 감동적으로";
        };

        return String.format(
                """
                아래 조건으로 한국어 단편 소설을 작성해줘.
                장르: %s
                톤: %s
                분량: %s
                키워드: %s
                """,
                genre != null ? genre : "일상",
                toneDesc,
                lengthDesc,
                String.join(", ", keywords)
        );
    }

    // ── 응답 파싱 ──────────────────────────────────────────────────────────

    private String[] parseResponse(String responseBody) {
        try {
            JsonNode root    = objectMapper.readTree(responseBody);
            String rawJson   = root.path("choices").get(0)
                                   .path("message").path("content").asText();
            JsonNode parsed  = objectMapper.readTree(rawJson);
            String title     = parsed.path("title").asText("");
            String content   = parsed.path("content").asText("");

            if (title.isBlank() || content.isBlank()) {
                throw new RuntimeException("AI 응답에서 title 또는 content를 찾을 수 없습니다.");
            }
            return new String[]{title, content};

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI 응답 파싱 실패: " + e.getMessage(), e);
        }
    }
}
