package com.eniyamart.exception;

/**
 * 404 - the requested entity does not exist.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
