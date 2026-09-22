package com.eniyamart.exception;

/**
 * 400 - business rule violated (validation / duplicate email / bad state).
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
