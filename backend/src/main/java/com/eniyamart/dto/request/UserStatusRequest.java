package com.eniyamart.dto.request;

import jakarta.validation.constraints.NotNull;

/** Body for enabling/disabling a customer or seller account. */
public record UserStatusRequest(
        @NotNull(message = "Enabled flag is required")
        Boolean enabled) {
}
