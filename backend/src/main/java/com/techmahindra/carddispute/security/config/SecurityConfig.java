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
                                .cors(Customizer.withDefaults())
                                // Stateless Basic-auth API; the Camunda webapp applies its own CSRF protection
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                                                .requestMatchers("/api/v1/workflow/tasks", "/api/v1/workflow/tasks/**")
                                                .hasRole(ANALYST)
                                                .anyRequest().authenticated());

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource(
                        @Value("${application.cors.allowed-origins}") String allowedOrigins) {

                List<String> origins = Arrays.stream(
                                allowedOrigins.split(","))
                                .map(String::trim)
                                .filter(origin -> !origin.isBlank())
                                .toList();

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(origins);

                configuration.setAllowedMethods(List.of("*"));

                configuration.setAllowedHeaders(List.of(
                                "Authorization",
                                "Content-Type",
                                "X-Correlation-Id"));

                configuration.setExposedHeaders(List.of(
                                "Location",
                                "X-Correlation-Id"));

                configuration.setAllowCredentials(true);

                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                                "/api/v1/**",
                                configuration);

                return source;
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
