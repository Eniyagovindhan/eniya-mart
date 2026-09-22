package com.eniyamart.dto.response;

import java.time.LocalDateTime;

public record AuthResponse(
        String token,
        String tokenType,
        Long id,
        String name,
        String email,
        String role,
        LocalDateTime createdAt) {

    public static AuthResponse bearer(String token, Long id, String name, String email, String role, LocalDateTime createdAt) {
        return new AuthResponse(token, "Bearer", id, name, email, role, createdAt);
    }
}
