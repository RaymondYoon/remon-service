package com.remon.book.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Gemini API 직접 호출 테스트.
 * 실행 전: GEMINI_API_KEY 환경변수를 설정하거나 아래 apiKey 변수에 직접 입력.
 *   Windows: set GEMINI_API_KEY=AIza...
 *   Mac/Linux: export GEMINI_API_KEY=AIza...
 */
class GeminiApiTest {

    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    @Test
    void testGeminiApiCall() throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("⚠️  GEMINI_API_KEY 환경변수가 설정되지 않았습니다. 테스트를 건너뜁니다.");
            System.out.println("   set GEMINI_API_KEY=AIza... 후 다시 실행하세요.");
            return;
        }

        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper objectMapper = new ObjectMapper();

        // ── 요청 body ────────────────────────────────────────────────
        String prompt = """
                너는 한국어 단편 소설 작가다.
                반드시 아래 JSON 형식으로만 응답해라. 다른 텍스트는 포함하지 마라.
                {"title": "소설 제목", "content": "소설 본문 전체"}

                아래 조건으로 한국어 단편 소설을 작성해줘.
                장르: 일상
                톤: 따뜻하고 감동적으로
                분량: 300자 내외 (테스트용 짧게)
                키워드: 고양이, 봄
                """;

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of("maxOutputTokens", 1024)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        String url = API_URL + "?key=" + apiKey;

        System.out.println("── Gemini API 호출 시작 ─────────────────────────────────");
        System.out.println("URL: " + API_URL + "?key=AIza...(마스킹)");
        System.out.println("요청 body:\n" + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(body));

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            System.out.println("\n── 응답 HTTP 상태: " + response.getStatusCode() + " ───────────────────");
            System.out.println("── 응답 body ───────────────────────────────────────────");

            String rawBody = response.getBody();
            JsonNode root = objectMapper.readTree(rawBody);
            System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(root));

            // ── 파싱 검증 ──────────────────────────────────────────────
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) {
                System.out.println("\n❌ 파싱 실패: candidates 배열이 비어있음");
                return;
            }

            String rawText = candidates.get(0)
                    .path("content").path("parts").get(0).path("text").asText("").strip();
            System.out.println("\n── AI 응답 text ────────────────────────────────────────");
            System.out.println(rawText);

            // 마크다운 코드블록 제거
            if (rawText.startsWith("```")) {
                rawText = rawText.replaceAll("(?s)^```(?:json)?\\s*", "").replaceAll("(?s)\\s*```$", "").strip();
            }

            JsonNode parsed = objectMapper.readTree(rawText);
            String title   = parsed.path("title").asText("");
            String content = parsed.path("content").asText("");

            System.out.println("\n── 파싱 결과 ───────────────────────────────────────────");
            System.out.println("title  : " + title);
            System.out.println("content: " + content.substring(0, Math.min(100, content.length())) + "...");

            if (title.isBlank() || content.isBlank()) {
                System.out.println("❌ title 또는 content가 비어있음");
            } else {
                System.out.println("✅ 파싱 성공!");
            }

        } catch (HttpClientErrorException e) {
            System.out.println("\n❌ HTTP 클라이언트 에러 " + e.getStatusCode());
            System.out.println("응답 body: " + e.getResponseBodyAsString());
        } catch (HttpServerErrorException e) {
            System.out.println("\n❌ HTTP 서버 에러 " + e.getStatusCode());
            System.out.println("응답 body: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            System.out.println("\n❌ 예외 발생: " + e.getClass().getSimpleName());
            System.out.println("메시지: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
