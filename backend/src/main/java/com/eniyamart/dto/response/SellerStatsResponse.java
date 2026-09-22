package com.eniyamart.dto.response;

import java.math.BigDecimal;

/** Aggregated numbers shown on the seller dashboard. */
public record SellerStatsResponse(
        long products,
        long lowStock,
        long pendingOrders,
        long unitsSold,
        BigDecimal revenue) {
}
