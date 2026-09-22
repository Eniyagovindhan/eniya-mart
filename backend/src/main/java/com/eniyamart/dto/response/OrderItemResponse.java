package com.eniyamart.dto.response;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String productImage,
        BigDecimal price,
        Integer quantity,
        BigDecimal totalPrice) {
}
