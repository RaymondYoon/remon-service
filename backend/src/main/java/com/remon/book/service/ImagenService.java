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
            String url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=" + geminiApiKey;

            String prompt = "Book cover illustration for a Korean short story titled '" + title
                    + "', genre: " + genre
                    + ". Soft watercolor style, warm colors, minimalist, no text, no letters";

            Map<String, Object> body = Map.of(
                    "instances", List.of(Map.of("prompt", prompt)),
                    "parameters", Map.of("sampleCount", 1)
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> predictions =
                        (List<Map<String, Object>>) response.getBody().get("predictions");
                if (predictions != null && !predictions.isEmpty()) {
                    String base64 = (String) predictions.get(0).get("bytesBase64Encoded");
                    if (base64 != null) {
                        return Base64.getDecoder().decode(base64);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Imagen 표지 생성 실패 - title: {}, message: {}", title, e.getMessage());
        }
        return null;
    }
}
