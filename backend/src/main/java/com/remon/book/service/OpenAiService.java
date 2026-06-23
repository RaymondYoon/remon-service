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
import java.util.stream.Collectors;

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
    public String[] generate(List<String> keywords, String genre, List<String> tone, String ending,
                             List<String> protagonistNames, List<String> protagonistTrait, String viewpoint,
                             String synopsis, List<String> characters) {
        String prompt = buildPrompt(keywords, genre, tone, ending, protagonistNames, protagonistTrait, viewpoint, synopsis, characters);

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

        log.info("Gemini 요청 시작 - url: {}, keywords: {}, genre: {}, tone: {}, ending: {}, protagonistNamesProvided: {}",
                apiUrl, keywords.size(), genre, tone, ending, protagonistNames != null && !protagonistNames.isEmpty());

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

    private String buildPrompt(List<String> keywords, String genre, List<String> tones, String ending,
                               List<String> protagonistNames, List<String> protagonistTraits, String viewpoint,
                               String synopsis, List<String> characters) {
        String toneDesc = (tones != null && !tones.isEmpty())
                ? tones.stream()
                        .map(t -> switch (t != null ? t.toUpperCase() : "WARM") {
                            case "DARK"        -> "어둡고 긴장감 있게";
                            case "HUMOROUS"    -> "유쾌하고 재미있게";
                            case "MYSTERIOUS"  -> "신비롭고 미스터리하게";
                            case "MELANCHOLY"  -> "쓸쓸하고 애잔하게";
                            case "TENSE"       -> "긴장감 넘치게";
                            case "EPIC"        -> "웅장하고 압도적으로";
                            case "BRUTAL"      -> "잔혹하고 거친 분위기";
                            case "DREAMY"      -> "몽환적이고 환상적인 분위기";
                            case "CYNICAL"     -> "냉소적이고 차가운 분위기";
                            default            -> "따뜻하고 감동적으로";
                        })
                        .collect(Collectors.joining(", "))
                : "따뜻하고 감동적으로";

        String endingDesc = switch (ending != null ? ending.toUpperCase() : "HAPPY") {
            case "SAD"  -> "새드엔딩 (슬프고 여운이 남는 결말)";
            case "OPEN" -> "열린결말 (독자가 상상할 여지를 남기는 결말)";
            default     -> "해피엔딩 (희망적이고 긍정적인 결말)";
        };

        List<String> validProtagonists = (protagonistNames != null)
                ? protagonistNames.stream().filter(n -> n != null && !n.isBlank()).collect(Collectors.toList())
                : List.of();
        String protagonistLine = validProtagonists.isEmpty()
                ? "주인공 이름: AI가 자유롭게 결정"
                : "주인공: " + String.join(", ", validProtagonists)
                  + (validProtagonists.size() > 1 ? " (여러 명이 함께 이야기를 이끌어갈 것)" : "");

        List<String> validCharacters = (characters != null)
                ? characters.stream().filter(c -> c != null && !c.isBlank()).collect(Collectors.toList())
                : List.of();
        String charactersLine = validCharacters.isEmpty()
                ? ""
                : "조연 등장인물: " + String.join(", ", validCharacters)
                  + "\n- 조연은 이야기에 자연스럽게 등장하되 주인공의 서사를 보조할 것";

        String viewpointDesc = "1인칭".equals(viewpoint)
                ? "1인칭 주인공 시점으로 서술 ('나'가 직접 겪는 방식)"
                : "3인칭 전지적 시점으로 서술";

        String protagonistTraitLine = (protagonistTraits != null && !protagonistTraits.isEmpty())
                ? "주인공 성격/특징: " + String.join(", ", protagonistTraits) + " — 이 특징들이 이야기 전반에 자연스럽게 드러나도록 할 것"
                : "";

        String synopsisLine = (synopsis != null && !synopsis.isBlank())
                ? "작가 제공 시놉시스: " + synopsis + "\n위 시놉시스를 바탕으로 이야기를 풀어내되,\n키워드와 장르에 맞게 확장하고 발전시킬 것."
                : "";

        return String.format(
                """
                너는 문학적 감수성이 뛰어난 한국어 단편 소설 작가다.
                반드시 아래 형식으로만 응답해라. 다른 텍스트는 절대 포함하지 마라.

                [TITLE]
                본문을 다 쓴 뒤, 그 내용에서 가장 인상적인 장면·감정·상징을 압축한 제목을 지어라.
                장르별 제목 스타일을 참고하라:
                - SF: 기술적 개념어 + 인간적 감정의 대비 (예: "마지막 신호", "기억의 반감기")
                - 판타지: 세계관의 핵심 상징물 또는 인물의 운명을 암시 (예: "어둠을 걷는 별이", "망자에게 빌린 눈동자")
                - 로맨스: 감정의 결정적 순간 또는 관계의 본질 (예: "네가 떠난 계절", "두 번째 첫인사")
                - 일상: 평범한 소재 속 깊은 의미 (예: "화요일의 커피", "창문 너머 그 사람")
                - 공포: 공포의 핵심 요소를 암시하되 직접 언급 금지 (예: "세 번 두드리는 소리", "그것은 미소 짓는다")
                - 액션: 강렬한 동사 + 대상 (예: "최후의 추격", "불꽃 속으로")
                - 스릴러: 긴장감을 암시하는 단어, 의문형 또는 불안감 조성 (예: "그가 남긴 것", "세 번째 목격자")
                - 드라마: 인물 관계나 감정의 핵심을 담은 표현 (예: "엄마의 레시피", "우리가 헤어진 이유")
                - 느와르: 어둠, 배신, 도시의 이미지 (예: "빗속의 총성", "거짓말쟁이의 밤")
                제목은 반드시 본문의 핵심 사건, 갈등, 또는 클라이맥스 장면을 반영해야 한다.
                감성적 표현보다 이야기의 본질을 담는 것을 우선으로 한다.
                제목은 10자 내외, 군더더기 없이 간결하게.

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
                - %s
                - 문단 구분은 반드시 지킬 것 — 3~5문장마다 빈 줄(\\n\\n)로 나눌 것.
                - 한 문단이 10문장을 넘지 않도록 할 것.
                - 문장은 간결하되 여운이 남는 표현 사용
                - 중복 표현, 과도한 수식어 지양

                === 테마 ===
                - 작가가 전달하고자 하는 메시지를 직접 언급하지 말 것
                - 캐릭터의 선택과 그 결과를 통해 테마를 자연스럽게 녹여낼 것

                [집필 전 내부 구상 - 출력 금지]
                본문을 쓰기 전, 내부적으로 다음을 먼저 구상하라:
                1. 주인공의 핵심 비밀과 결핍
                2. 이야기의 중심 갈등과 반전 포인트
                3. 클라이맥스 장면의 오감 묘사 요소 (시각/청각/촉각 중 최소 2가지)
                구상 내용은 절대 출력하지 말고 본문에만 반영할 것.

                === 생성 조건 ===
                장르: %s
                톤: %s
                분량: 반드시 5500자 이상 6500자 이내로 작성할 것.
                이야기를 너무 빨리 마무리하지 말고, 각 장면을 충분히 묘사하며 전개할 것.
                절대 3000자 이하로 짧게 끝내지 말 것.
                결말: %s
                %s
                %s
                %s
                키워드: %s
                %s
                타겟 독자: 성인 / 책을 잘 읽지 않는 독자도 몰입할 수 있도록 첫 문장부터 강렬하게, 문체는 간결하고 세련되게
                """,
                viewpointDesc,
                genre != null ? genre : "일상",
                toneDesc,
                endingDesc,
                protagonistLine,
                protagonistTraitLine,
                charactersLine,
                String.join(", ", keywords),
                synopsisLine
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
