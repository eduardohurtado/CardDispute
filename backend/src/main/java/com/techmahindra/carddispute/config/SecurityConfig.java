package com.techmahindra.carddispute.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techmahindra.carddispute.common.security.DemoUserDetailsService;
import com.techmahindra.carddispute.common.security.DemoUsersProperties;
import com.techmahindra.carddispute.common.security.ProblemDetailsSecurityHandler;
import com.techmahindra.carddispute.common.security.Role;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Simplified POC security: HTTP Basic with synthetic demo users (no real IAM).
 * Identity always comes from the principal, never from request bodies.
 */
@Configuration
@EnableConfigurationProperties(DemoUsersProperties.class)
public class SecurityConfig {

    private static final String CUSTOMER = Role.CUSTOMER.name();
    private static final String ANALYST = Role.DISPUTE_ANALYST.name();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        ProblemDetailsSecurityHandler problemHandler = new ProblemDetailsSecurityHandler(objectMapper);

        http
                // Stateless Basic-auth API; the Camunda webapp applies its own CSRF protection
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.authenticationEntryPoint(problemHandler))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(problemHandler)
                        .accessDeniedHandler(problemHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error", "/actuator/health").permitAll()
                        // Camunda webapp has its own login (camunda.bpm.admin-user); local only
                        .requestMatchers("/camunda/**").permitAll()
                        .requestMatchers("/engine-rest/**").hasRole(ANALYST)
                        .requestMatchers("/api/v1/transactions/**").hasRole(CUSTOMER)
                        .requestMatchers(HttpMethod.POST, "/api/v1/disputes").hasRole(CUSTOMER)
                        .requestMatchers("/api/v1/disputes/**").hasAnyRole(CUSTOMER, ANALYST)
                        .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public DemoUserDetailsService demoUserDetailsService(DemoUsersProperties properties,
                                                         PasswordEncoder passwordEncoder) {
        return new DemoUserDetailsService(properties, passwordEncoder);
    }
}
