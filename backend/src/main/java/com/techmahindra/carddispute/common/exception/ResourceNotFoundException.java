package com.techmahindra.carddispute.common.exception;

import org.springframework.http.HttpStatus;

/** 404 - also used for resources the caller is not allowed to see, to avoid leaking existence. */
public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String errorCode, String message) {
        super(HttpStatus.NOT_FOUND, errorCode, message);
    }
}
