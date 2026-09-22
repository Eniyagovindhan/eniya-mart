package com.eniyamart.dto.response;

import com.eniyamart.entity.Category;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        long productCount,
        LocalDateTime createdAt) {

    public static CategoryResponse from(Category category, long productCount) {
        return new CategoryResponse(category.getId(), category.getName(), productCount, category.getCreatedAt());
    }
}
