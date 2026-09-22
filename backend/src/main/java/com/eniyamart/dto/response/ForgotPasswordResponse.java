package com.eniyamart.dto.response;

/**
 * Returned by the forgot-password endpoint.
 * {@code devResetUrl} is only present when {@code app.mail.enabled=false},
 * so the flow can be completed without an SMTP server (development mode).
 */
public record ForgotPasswordResponse(String message, String devResetUrl) {
}
