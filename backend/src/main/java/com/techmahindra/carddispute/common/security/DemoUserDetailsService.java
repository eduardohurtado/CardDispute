package com.techmahindra.carddispute.common.security;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Resolves the configured synthetic users into {@link AuthenticatedUser} principals. */
public class DemoUserDetailsService implements UserDetailsService {

    private final Map<String, AuthenticatedUser> users;

    public DemoUserDetailsService(DemoUsersProperties properties, PasswordEncoder passwordEncoder) {
        this.users = properties.demoUsers().stream()
                .map(user -> {
                    if (user.role() == Role.CUSTOMER && user.customerId() == null) {
                        throw new IllegalStateException("Demo customer " + user.username() + " needs a customer-id");
                    }
                    return new AuthenticatedUser(user.username(), passwordEncoder.encode(user.password()),
                            user.role(), user.customerId());
                })
                .collect(Collectors.toUnmodifiableMap(AuthenticatedUser::username, Function.identity()));
    }

    @Override
    public AuthenticatedUser loadUserByUsername(String username) {
        AuthenticatedUser user = users.get(username);
        if (user == null) {
            throw new UsernameNotFoundException("Unknown user");
        }
        return user;
    }
}
