package com.eniyamart.dto.response;

import java.math.BigDecimal;

/** Aggregated numbers shown on the admin dashboard. */
public record AdminStatsResponse(
        long customers,
        long sellers,
        long products,
        long categories,
        long orders,
        long pendingOrders,
        BigDecimal revenue) {
}
