package com.techmahindra.carddispute.security;

public enum Role {
    CUSTOMER,
    DISPUTE_ANALYST;

    public String authority() {
        return "ROLE_" + name();
    }
}
