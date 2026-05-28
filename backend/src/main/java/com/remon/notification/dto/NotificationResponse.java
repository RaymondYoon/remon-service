package com.remon.notification.dto;

import com.remon.notification.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private Long senderId;
    private NotificationType type;
    private String message;
    private Long bookId;
    private boolean isRead;
    private String createdAt;
}
