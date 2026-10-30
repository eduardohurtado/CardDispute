package com.techmahindra.carddispute.dispute.security.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.techmahindra.carddispute.security.service.DatabaseUserDetailsService;

@TestConfiguration(proxyBeanMethods = false)
public class TestAuthenticationConfig {

    @Bean
    public AuthenticationManager testAuthenticationManager(
            DatabaseUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(provider);
    }
}
