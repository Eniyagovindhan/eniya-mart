package com.eniyamart.exception;

/**
 * 401 - the caller is not authenticated (missing / invalid / expired token).
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
