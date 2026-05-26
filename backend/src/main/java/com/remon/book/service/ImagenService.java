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

    public byte[] generateCoverImage(String title, String genre, String content) {
        try {
            String summary = (content != null && content.length() > 100)
                    ? content.substring(0, 100) : (content != null ? content : "");

            String prompt = "simple anime illustration, book cover art, studio ghibli inspired style, " +
                    "title: " + title + ", genre: " + genre + ", story summary: " + summary + ". " +
                    "clean minimalist composition, soft pastel colors, simple background, " +
                    "one main visual element that represents the story mood and theme, " +
                    "NO TEXT, NO LETTERS, NO WORDS, NO WRITING, purely visual illustration only";

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
