package com.remon.book.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class ImagenService {

    private static final Logger log = LoggerFactory.getLogger(ImagenService.class);

    @Value("${openai.api-key}")
    private String openaiApiKey;

    private final RestTemplate restTemplate;

    public ImagenService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(60000);
        this.restTemplate = new RestTemplate(factory);
    }

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
                    "quality", "auto"
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
