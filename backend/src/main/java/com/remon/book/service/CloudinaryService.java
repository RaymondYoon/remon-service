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

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @SuppressWarnings("unchecked")
    public String uploadImage(byte[] imageBytes, String publicId) {
        try {
            Map result = cloudinary.uploader().upload(imageBytes, ObjectUtils.asMap(
                    "public_id", publicId,
                    "folder", "remon-covers"
            ));
            return (String) result.get("secure_url");
        } catch (Exception e) {
            log.warn("Cloudinary 업로드 실패 - publicId: {}, message: {}", publicId, e.getMessage());
            return null;
        }
    }
}
