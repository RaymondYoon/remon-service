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

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.url}")
    private String apiUrl;

    public OpenAiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Gemini generateContent API 호출.
     * 프롬프트에서 {"title": "...", "content": "..."} JSON 형태로 응답받는다.
     *
     * @return 파싱된 결과 — result[0] = title, result[1] = content
     */
    public String[] generate(List<String> keywords, String genre, String tone, String ending, String protagonistName) {
        String prompt = buildPrompt(keywords, genre, tone, ending, protagonistName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of("maxOutputTokens", 8192)
        );

        String url = apiUrl + "?key=" + apiKey;
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        return parseResponse(response.getBody());
    }

    // ── 프롬프트 ────────────────────────────────────────────────────────────

    private String buildPrompt(List<String> keywords, String genre, String tone, String ending, String protagonistName) {
        String toneDesc = switch (tone != null ? tone.toUpperCase() : "WARM") {
            case "DARK"      -> "어둡고 긴장감 있게";
            case "HUMOROUS"  -> "유쾌하고 재미있게";
            default          -> "따뜻하고 감동적으로";
        };

        String endingDesc = switch (ending != null ? ending.toUpperCase() : "HAPPY") {
            case "SAD"  -> "새드엔딩 (슬프고 여운이 남는 결말)";
            case "OPEN" -> "열린결말 (독자가 상상할 여지를 남기는 결말)";
            default     -> "해피엔딩 (희망적이고 긍정적인 결말)";
        };

        String protagonistLine = (protagonistName != null && !protagonistName.isBlank())
                ? "주인공 이름: " + protagonistName
                : "주인공 이름: AI가 자유롭게 결정";

        return String.format(
                """
                너는 한국어 단편 소설 작가다.
                반드시 아래 JSON 형식으로만 응답해라. 다른 텍스트는 절대 포함하지 마라.
                {"title": "소설 제목", "content": "소설 본문 전체"}

                본문 작성 규칙:
                - 마크다운 문법(**, *, --, ---, ~~) 절대 사용 금지
                - 단락 구분은 반드시 빈 줄(\\n\\n)로만 표시
                - "..." 또는 "* * *" 같은 장식 구분선 사용 금지
                - 문장 부호 외에 특수기호 사용 금지

                아래 조건으로 한국어 단편 소설을 작성해줘.
                장르: %s
                톤: %s
                분량: 3000자 내외
                결말: %s
                %s
                키워드: %s
                """,
                genre != null ? genre : "일상",
                toneDesc,
                endingDesc,
                protagonistLine,
                String.join(", ", keywords)
        );
    }

    // ── 응답 파싱 ──────────────────────────────────────────────────────────

    private String[] parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) {
                throw new RuntimeException("Gemini 응답에 candidates가 없습니다. 응답: " + responseBody);
            }

            String rawJson = candidates.get(0)
                    .path("content").path("parts").get(0).path("text").asText().strip();

            // 마크다운 코드블록(```json ... ```) 래핑 제거
            if (rawJson.startsWith("```")) {
                rawJson = rawJson.replaceAll("(?s)^```(?:json)?\\s*", "").replaceAll("(?s)\\s*```$", "").strip();
            }

            JsonNode parsed  = objectMapper.readTree(rawJson);
            String title     = parsed.path("title").asText("");
            String content   = parsed.path("content").asText("");

            if (title.isBlank() || content.isBlank()) {
                throw new RuntimeException("AI 응답에서 title 또는 content를 찾을 수 없습니다. rawJson: " + rawJson);
            }
            return new String[]{title, content};

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI 응답 파싱 실패: " + e.getMessage(), e);
        }
    }
}
