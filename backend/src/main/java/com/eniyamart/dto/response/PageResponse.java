package com.eniyamart.dto.response;

import java.util.List;

/**
 * Simple pagination wrapper used by the product listing API.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last) {

    public PageResponse(List<T> content, int page, int size, long totalElements, int totalPages) {
        this(content, page, size, totalElements, totalPages, totalPages == 0 || page >= totalPages - 1);
    }
}
