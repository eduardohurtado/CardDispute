package com.techmahindra.carddispute.security;

public enum Role {
    CUSTOMER,
    DISPUTE_ANALYST,
    NOTIFICATION_WORKER;

    public String authority() {
        return "ROLE_" + name();
    }
}
