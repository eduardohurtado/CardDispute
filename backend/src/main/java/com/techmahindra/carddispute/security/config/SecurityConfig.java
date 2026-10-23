package com.techmahindra.carddispute.security.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techmahindra.carddispute.security.ProblemDetailsSecurityHandler;
import com.techmahindra.carddispute.security.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Simplified POC security: HTTP Basic with synthetic demo users (no real IAM).
 * Identity always comes from the principal, never from request bodies.
 */
@Configuration
public class SecurityConfig {

    private static final String CUSTOMER = Role.CUSTOMER.name();
    private static final String ANALYST = Role.DISPUTE_ANALYST.name();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        ProblemDetailsSecurityHandler problemHandler = new ProblemDetailsSecurityHandler(objectMapper);

        http
                // Stateless Basic-auth API; the Camunda webapp applies its own CSRF protection
                .csrf(AbstractHttpConfigurer::disable)
                // The SPA runs on another origin in development (localhost:3000).
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.authenticationEntryPoint(problemHandler))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(problemHandler)
                        .accessDeniedHandler(problemHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error", "/actuator/health").permitAll()
                        // swagger-ui
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml")
                        .permitAll()
                        // Camunda webapp has its own login (camunda.bpm.admin-user); local only
                        .requestMatchers("/camunda/**").permitAll()
                        .requestMatchers("/engine-rest/**").hasRole(ANALYST)
                        .requestMatchers("/api/v1/transactions/**").hasRole(CUSTOMER)
                        .requestMatchers(HttpMethod.POST, "/api/v1/disputes").hasRole(CUSTOMER)
                        .requestMatchers("/api/v1/disputes/**").hasAnyRole(CUSTOMER, ANALYST)
                        .anyRequest().authenticated());

        return http.build();
    }

    /**
     * CORS for the SPA. Only the API is exposed; the Camunda webapp keeps its own
     * rules.
     * Credentials are not allowed: the SPA authenticates with the Authorization
     * header, not cookies.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${application.security.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("*"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
