package com.techmahindra.carddispute.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.UUID;

/** Synthetic demo identities bound from {@code application.security.demo-users}. */
@ConfigurationProperties(prefix = "application.security")
public record DemoUsersProperties(List<DemoUser> demoUsers) {

    public DemoUsersProperties {
        demoUsers = demoUsers == null ? List.of() : List.copyOf(demoUsers);
    }

    public record DemoUser(String username, String password, Role role, UUID customerId) {
    }
}
