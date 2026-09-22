package com.eniyamart.dto.response;

import com.eniyamart.entity.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        String phone,
        String role,
        boolean enabled,
        LocalDateTime createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole() == null ? "CUSTOMER" : user.getRole().name(),
                user.isEnabled(),
                user.getCreatedAt());
    }
}
