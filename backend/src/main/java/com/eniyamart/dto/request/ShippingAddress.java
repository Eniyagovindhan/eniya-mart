package com.eniyamart.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Delivery address captured during checkout.
 */
public record ShippingAddress(
        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Name is too long")
        String fullName,

        @NotBlank(message = "Address line is required")
        @Size(max = 200, message = "Address is too long")
        String line1,

        @Size(max = 200, message = "Address is too long")
        String line2,

        @NotBlank(message = "City is required")
        @Size(max = 80, message = "City is too long")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 80, message = "State is too long")
        String state,

        @NotBlank(message = "Pincode is required")
        @Pattern(regexp = "[0-9]{4,10}", message = "Pincode must be 4-10 digits")
        String pincode,

        @NotBlank(message = "Phone is required")
        @Pattern(regexp = "[0-9+\\- ]{7,20}", message = "Enter a valid phone number")
        String phone) {
}
