package com.remon.book.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OpenAI gpt-image-1 기반 표지 이미지 생성기.
 * (이전 이름 ImagenService — Google Imagen 이 아니라 OpenAI 를 호출하던 이름/역할 불일치를 정리)
 */
@Service
public class OpenAiCoverImageGenerator implements CoverImageGenerator {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCoverImageGenerator.class);

    @Value("${openai.api-key}")
    private String openaiApiKey;

    private static final int CONNECT_TIMEOUT_MS = 10_000;

    private final RestTemplate restTemplate;
    private final String quality;

    /**
     * @param readTimeoutMs gpt-image-1 세로 이미지(1024x1536)는 60초를 넘기는 경우가 많아 기본 180초
     * @param quality       low | medium | high | auto — 기본 medium (표지 크기에서 품질 차이는 작고 더 빠르고 저렴)
     */
    public OpenAiCoverImageGenerator(@Value("${openai.image.timeout-ms:180000}") int readTimeoutMs,
                                     @Value("${openai.image.quality:medium}") String quality) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);
        this.quality = quality;
    }

    @Override
    @SuppressWarnings("unchecked")
    public byte[] generateCoverImage(String title, String genre, String content) {
        try {
            String summary = (content != null && content.length() > 100)
                    ? content.substring(0, 100) : (content != null ? content : "");

            String prompt = "Book cover illustration for a Korean short story. " +
                    "Title: " + title + ", Genre: " + genre + ", Story: " + summary + ". " +
                    "Studio Ghibli inspired anime style, soft watercolor, warm pastel colors, " +
                    "minimalist composition, one main visual element, " +
                    "absolutely NO TEXT, NO LETTERS, NO WORDS, NO WRITING of any kind";

            Map<String, Object> body = Map.of(
                    "model", "gpt-image-1",
                    "prompt", prompt,
                    "n", 1,
                    "size", "1024x1536",
                    "quality", quality
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/images/generations", request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
                if (data != null && !data.isEmpty()) {
                    String b64Json = (String) data.get(0).get("b64_json");
                    if (b64Json != null) {
                        return Base64.getDecoder().decode(b64Json);
                    }
                    String imageUrl = (String) data.get(0).get("url");
                    if (imageUrl != null) {
                        return restTemplate.getForObject(imageUrl, byte[].class);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("표지 이미지 생성 실패 - title: {}, message: {}", title, e.getMessage());
        }
        return null;
    }
}
