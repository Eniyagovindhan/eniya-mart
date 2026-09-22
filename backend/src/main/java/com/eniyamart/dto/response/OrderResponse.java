package com.eniyamart.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        String status,
        String paymentMethod,
        BigDecimal subtotal,
        BigDecimal shipping,
        BigDecimal total,
        List<OrderItemResponse> items,
        String addressFullName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String pincode,
        String phone,
        String notes,
        Long userId,
        String customerName,
        String customerEmail,
        LocalDateTime createdAt) {
}
