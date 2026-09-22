package com.eniyamart.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for changing an order status (admin or owning seller). */
public record StatusUpdateRequest(
        @NotBlank(message = "Status is required")
        @Size(max = 20, message = "Status is too long")
        String status) {
}
