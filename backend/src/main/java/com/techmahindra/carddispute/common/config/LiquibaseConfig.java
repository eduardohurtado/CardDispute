package com.techmahindra.carddispute.common.config;

import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import liquibase.integration.spring.SpringLiquibase;

@Configuration
@EnableConfigurationProperties(LiquibaseConfig.LiquibaseProperties.class)
public class LiquibaseConfig {

    private final String businessSchemaNamePropertyName = "businessSchemaName";
    private final String notificationWorkerPasswordHashProperty = "notificationWorkerPasswordHash";

    @Bean(name = "liquibaseDataSource")
    @ConfigurationProperties(prefix = "application.datasource.liquibase")
    public DataSource liquibaseDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    public SpringLiquibase liquibase(
            @Qualifier("liquibaseDataSource") DataSource liquibaseDataSource,
            PasswordEncoder passwordEncoder,
            @Value("${application.notification.worker.password-hash}")
                    String notificationWorkerPasswordHash,
            LiquibaseProperties properties) {

        SpringLiquibase liquibase = new SpringLiquibase();

        liquibase.setDataSource(liquibaseDataSource);
        liquibase.setChangeLog(properties.changeLog());
        liquibase.setLiquibaseSchema(properties.liquibaseSchema());
        liquibase.setChangeLogParameters(
                Map.of(
                        businessSchemaNamePropertyName,
                        properties.defaultSchema(),
                        notificationWorkerPasswordHashProperty,
                        passwordEncoder.encode(notificationWorkerPasswordHash)));
        // When no contexts are configured Liquibase runs every changeset (schema + demo seed)
        liquibase.setContexts(properties.contexts());

        return liquibase;
    }

    @ConfigurationProperties(prefix = "application.liquibase")
    public record LiquibaseProperties(
            String changeLog, String defaultSchema, String liquibaseSchema, String contexts) {}
}
