package com.techmahindra.carddispute.common.web;

import java.util.UUID;

import org.slf4j.MDC;

/** Access to the correlation id of the current request/thread (kept in the logging MDC). */
public final class CorrelationId {

    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    private CorrelationId() {}

    /** Current correlation id, or a new one when running outside an HTTP request. */
    public static String current() {
        String value = MDC.get(MDC_KEY);
        return value != null ? value : UUID.randomUUID().toString();
    }
}
