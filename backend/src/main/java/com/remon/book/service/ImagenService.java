package com.remon.book.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class ImagenService {

    private static final Logger log = LoggerFactory.getLogger(ImagenService.class);

    @Value("${gemini.api-key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public byte[] generateCoverImage(String title, String genre) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:generateContent?key=" + geminiApiKey;

            String prompt = "Book cover illustration for a Korean short story titled '" + title
                    + "', genre: " + genre
                    + ". Soft watercolor style, warm colors, minimalist, no text, no letters";

            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", Map.of(
                            "responseModalities", List.of("IMAGE"),
                            "responseMimeType", "image/jpeg"
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> candidates =
                        (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map<String, Object> inlineData = (Map<String, Object>) parts.get(0).get("inlineData");
                            if (inlineData != null) {
                                String base64 = (String) inlineData.get("data");
                                if (base64 != null) {
                                    return Base64.getDecoder().decode(base64);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Imagen 표지 생성 실패 - title: {}, message: {}", title, e.getMessage());
        }
        return null;
    }
}
