package com.remon.book.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);

    private static final String COVER_FOLDER = "remon-covers";

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @SuppressWarnings("unchecked")
    public String uploadImage(byte[] imageBytes, String publicId) {
        try {
            Map result = cloudinary.uploader().upload(imageBytes, ObjectUtils.asMap(
                    "public_id", publicId,
                    "folder", COVER_FOLDER
            ));
            return (String) result.get("secure_url");
        } catch (Exception e) {
            log.warn("Cloudinary 업로드 실패 - publicId: {}, message: {}", publicId, e.getMessage());
            return null;
        }
    }

    /**
     * 업로드된 이미지 URL로 Cloudinary 이미지를 삭제한다.
     * 계정의 폴더 모드(fixed/dynamic)에 따라 public id 에 폴더가 포함되는지가 달라지므로,
     * 고정 규칙 대신 실제 전달 URL 에서 public id 를 추출한다.
     */
    public void deleteImageByUrl(String imageUrl) {
        String publicId = extractPublicId(imageUrl);
        if (publicId == null) {
            log.warn("Cloudinary public id 추출 실패 - url: {}", imageUrl);
            return;
        }
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Cloudinary 이미지 삭제 - publicId: {}, result: {}", publicId, result.get("result"));
        } catch (Exception e) {
            log.warn("Cloudinary 이미지 삭제 실패 - publicId: {}, message: {}", publicId, e.getMessage());
        }
    }

    /**
     * https://res.cloudinary.com/{cloud}/image/upload/v1712345678/remon-covers/book-1.png
     *   → remon-covers/book-1
     */
    static String extractPublicId(String imageUrl) {
        if (imageUrl == null) return null;
        int uploadIdx = imageUrl.indexOf("/upload/");
        if (uploadIdx < 0) return null;
        String path = imageUrl.substring(uploadIdx + "/upload/".length());
        path = path.replaceFirst("^v\\d+/", "");
        int queryIdx = path.indexOf('?');
        if (queryIdx >= 0) path = path.substring(0, queryIdx);
        int dotIdx = path.lastIndexOf('.');
        if (dotIdx > path.lastIndexOf('/')) path = path.substring(0, dotIdx);
        return path.isBlank() ? null : path;
    }
}
