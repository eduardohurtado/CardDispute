package com.techmahindra.carddispute.common.security;

public enum Role {
    CUSTOMER,
    DISPUTE_ANALYST;

    public String authority() {
        return "ROLE_" + name();
    }
}
