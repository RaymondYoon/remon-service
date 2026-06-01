package com.remon.book.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OpenAiService {

    private static final Logger log = LoggerFactory.getLogger(OpenAiService.class);

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
     * 프롬프트에서 [TITLE] / [CONTENT] 구분자 형식으로 응답받는다.
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
                "generationConfig", Map.of(
                        "maxOutputTokens", 8192
                )
        );

        String url = apiUrl + "?key=" + apiKey;
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        log.info("Gemini 요청 시작 - url: {}, keywords: {}, genre: {}, tone: {}, ending: {}, protagonistNameProvided: {}",
                apiUrl, keywords.size(), genre, tone, ending, protagonistName != null && !protagonistName.isBlank());

        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                String responseBody = response.getBody();
                log.info("Gemini 응답 수신 - status: {}, bodyLength: {}",
                        response.getStatusCode(), responseBody != null ? responseBody.length() : 0);
                return parseResponse(responseBody);
            } catch (HttpServerErrorException.InternalServerError | HttpServerErrorException.ServiceUnavailable e) {
                log.warn("Gemini {} 오류 (attempt {}/{}) - 3초 후 재시도. responseBody: {}",
                        e.getStatusCode(), attempt, maxAttempts, e.getResponseBodyAsString());
                if (attempt == maxAttempts) {
                    throw new RuntimeException("Gemini API HTTP 오류: " + e.getStatusCode(), e);
                }
                try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            } catch (HttpStatusCodeException e) {
                log.error("Gemini HTTP 오류 - status: {}, responseBody: {}",
                        e.getStatusCode(), e.getResponseBodyAsString(), e);
                throw new RuntimeException("Gemini API HTTP 오류: " + e.getStatusCode(), e);
            } catch (Exception e) {
                log.error("Gemini 호출 중 예외 발생 - message: {}", e.getMessage(), e);
                throw e;
            }
        }
        throw new RuntimeException("Gemini API 재시도 횟수 초과");
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
                너는 문학적 감수성이 뛰어난 한국어 단편 소설 작가다.
                반드시 아래 형식으로만 응답해라. 다른 텍스트는 절대 포함하지 마라.

                [TITLE]
                소설 제목

                [CONTENT]
                소설 본문 전체

                === 출력 형식 규칙 (절대 준수) ===
                - 마크다운 문법(**, *, ##, --, ~~) 절대 사용 금지
                - 문단 구분은 반드시 빈 줄(\\n\\n)로만 표시
                - "..." 또는 "* * *" 같은 장식 구분선 사용 금지
                - 문장 부호 외에 특수기호 사용 금지
                - 대화문은 반드시 큰따옴표(" ")를 사용

                === 서사 구조 ===
                - 첫 문장(또는 첫 문단)은 독자를 즉시 사로잡는 강렬한 훅(Hook)으로 시작할 것
                  (예: 긴장감 있는 장면 한 가운데, 충격적인 사실 공개, 강렬한 감각 묘사)
                - 기승전결 구조로 서사를 전개하되, 각 단계가 자연스럽게 이어지도록 구성
                - 결말은 여운이 남도록 마무리

                === 묘사 기법 ===
                - "그는 화가 났다" 같은 직접 서술(Telling) 금지
                - 반드시 행동·감각 묘사로 감정을 보여줄 것(Showing):
                  예) "그는 주먹을 꽉 쥐었고, 손톱이 살을 파고들었다"
                - 시각, 청각, 후각, 촉각, 미각 등 오감을 적극 활용하여 배경을 묘사

                === 문체 ===
                - 3인칭 전지적 시점으로 서술
                - 문단은 반드시 3~5문장 단위로 나누고 빈 줄로 구분
                - 문장은 간결하되 여운이 남는 표현 사용
                - 중복 표현, 과도한 수식어 지양

                === 테마 ===
                - 작가가 전달하고자 하는 메시지를 직접 언급하지 말 것
                - 캐릭터의 선택과 그 결과를 통해 테마를 자연스럽게 녹여낼 것

                === 생성 조건 ===
                장르: %s
                톤: %s
                분량: 2500자 내외
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

            String raw = candidates.get(0)
                    .path("content").path("parts").get(0).path("text").asText().strip();

            log.info("Gemini 원본 응답 텍스트 길이: {}", raw.length());

            return parseDelimited(raw);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI 응답 파싱 실패: " + e.getMessage(), e);
        }
    }

    /**
     * [TITLE] ~ [CONTENT] 구분자로 title/content 추출.
     * 파싱 실패 시 첫 줄을 title, 나머지를 content로 사용하는 fallback 적용.
     */
    private String[] parseDelimited(String raw) {
        Pattern pattern = Pattern.compile(
                "\\[TITLE]\\s*(.+?)\\s*\\[CONTENT]\\s*(.+)",
                Pattern.DOTALL | Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = pattern.matcher(raw);

        if (matcher.find()) {
            String title   = matcher.group(1).strip();
            String content = matcher.group(2).strip();
            if (!title.isBlank() && !content.isBlank()) {
                log.info("구분자 파싱 성공 - title: '{}', contentLength: {}", title, content.length());
                return new String[]{title, content};
            }
        }

        // fallback: 첫 줄 title, 나머지 content
        log.warn("구분자 파싱 실패 — fallback 적용. raw 앞 200자: {}",
                raw.length() > 200 ? raw.substring(0, 200) : raw);
        String[] lines = raw.split("\\r?\\n", 2);
        String title   = lines[0].strip();
        String content = lines.length > 1 ? lines[1].strip() : "";

        if (title.isBlank() || content.isBlank()) {
            throw new RuntimeException("AI 응답에서 title 또는 content를 추출할 수 없습니다. raw: " + raw);
        }
        return new String[]{title, content};
    }
}
