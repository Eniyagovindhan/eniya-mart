package com.eniyamart.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        List<CartItemResponse> items,
        int totalItems,
        BigDecimal subtotal) {
}
