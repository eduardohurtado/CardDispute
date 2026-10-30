package com.techmahindra.carddispute.common.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * Base class for expected business/API failures that map to a Problem Details response. {@code
 * errorCode} is a stable machine-readable code the frontend can switch on.
 */
@Getter
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected ApiException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
