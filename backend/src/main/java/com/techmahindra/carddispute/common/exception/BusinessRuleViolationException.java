package com.techmahindra.carddispute.common.exception;

import org.springframework.http.HttpStatus;

/** 422 - the request is well formed but violates a business eligibility rule. */
public class BusinessRuleViolationException extends ApiException {

    public BusinessRuleViolationException(String errorCode, String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, errorCode, message);
    }
}
