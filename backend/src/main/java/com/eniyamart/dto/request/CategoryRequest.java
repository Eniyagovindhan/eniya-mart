package com.eniyamart.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for admin category create / rename. */
public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        @Size(max = 60, message = "Category name is too long")
        String name) {
}
