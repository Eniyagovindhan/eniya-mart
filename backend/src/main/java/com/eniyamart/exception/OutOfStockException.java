package com.eniyamart.exception;

/**
 * 409 - the requested item is no longer available in the requested quantity.
 */
public class OutOfStockException extends RuntimeException {

    public OutOfStockException(String message) {
        super(message);
    }
}
