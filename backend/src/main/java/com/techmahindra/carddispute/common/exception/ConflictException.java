package com.techmahindra.carddispute.common.exception;

import org.springframework.http.HttpStatus;

/** 409 - duplicate open dispute, invalid state transition or concurrent modification. */
public class ConflictException extends ApiException {

    public ConflictException(String errorCode, String message) {
        super(HttpStatus.CONFLICT, errorCode, message);
    }
}
