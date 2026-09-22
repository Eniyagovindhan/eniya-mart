package com.eniyamart.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 150, message = "Product name is too long")
        String name,

        @Size(max = 2000, message = "Description is too long")
        String description,

        @Size(max = 80, message = "Brand name is too long")
        String brand,

        @NotBlank(message = "Category is required")
        @Size(max = 60, message = "Category is too long")
        String category,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        BigDecimal price,

        @DecimalMin(value = "0.01", message = "Discount price must be greater than 0")
        BigDecimal discountPrice,

        @NotNull(message = "Stock is required")
        @Min(value = 0, message = "Stock cannot be negative")
        Integer stock,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl,

        @DecimalMin(value = "0.00", message = "Rating cannot be negative")
        BigDecimal rating,

        @Min(value = 0, message = "Reviews count cannot be negative")
        Integer reviewsCount,

        Boolean featured) {
}
