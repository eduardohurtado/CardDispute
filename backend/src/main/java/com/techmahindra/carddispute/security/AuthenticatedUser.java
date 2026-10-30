package com.techmahindra.carddispute.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Synthetic authenticated principal. For customers {@code customerId} links the login to the {@code
 * customer} table and is the only source of identity for ownership checks.
 */
public record AuthenticatedUser(String username, String password, Role role, UUID customerId)
        implements UserDetails {

    public boolean isAnalyst() {
        return role == Role.DISPUTE_ANALYST;
    }

    public UUID requireCustomerId() {
        if (role != Role.CUSTOMER || customerId == null) {
            throw new AccessDeniedException(
                    "Only customers can access their own transactions and disputes");
        }
        return customerId;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.authority()));
    }

    @Override
    public String toString() {
        return "AuthenticatedUser[username=" + username + ", role=" + role + "]";
    }
}
