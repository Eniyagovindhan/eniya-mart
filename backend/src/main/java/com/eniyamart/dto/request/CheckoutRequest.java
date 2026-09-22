package com.eniyamart.dto.request;

import com.eniyamart.entity.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Checkout payload.
 * <ul>
 *   <li>{@code items} - explicit items for "Buy Now". When {@code null} the
 *       server uses (and then clears) the user's shopping cart.</li>
 * </ul>
 */
public record CheckoutRequest(
        @Size(max = 100, message = "Too many items in one order")
        List<OrderItemRequest> items,

        @Valid
        @NotNull(message = "Shipping address is required")
        ShippingAddress address,

        @NotNull(message = "Payment method is required")
        Order.PaymentMethod paymentMethod,

        @Size(max = 500, message = "Order note is too long")
        String notes) {
}
