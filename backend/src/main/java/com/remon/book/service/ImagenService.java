package com.remon.book.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class ImagenService {

    private static final Logger log = LoggerFactory.getLogger(ImagenService.class);

    private final RestTemplate restTemplate;

    public ImagenService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    public byte[] generateCoverImage(String title, String genre) {
        try {
            String prompt = "book cover illustration, " + genre + " korean short story titled " + title
                    + ", soft watercolor style, warm pastel colors, minimalist, artistic, no text, no letters, no words";

            String encodedPrompt = URLEncoder.encode(prompt, StandardCharsets.UTF_8);
            String url = "https://image.pollinations.ai/prompt/" + encodedPrompt
                    + "?width=512&height=768&nologo=true";

            return restTemplate.getForObject(url, byte[].class);
        } catch (Exception e) {
            log.warn("표지 이미지 생성 실패 - title: {}, message: {}", title, e.getMessage());
        }
        return null;
    }
}
