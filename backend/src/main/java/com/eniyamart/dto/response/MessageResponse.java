package com.eniyamart.dto.response;

/**
 * Generic success/error message payload.
 */
public record MessageResponse(String message) {

    public static MessageResponse of(String message) {
        return new MessageResponse(message);
    }
}
