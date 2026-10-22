package com.techmahindra.carddispute.common.config;

import liquibase.integration.spring.SpringLiquibase;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.Map;

@Configuration
@EnableConfigurationProperties(LiquibaseConfig.LiquibaseProperties.class)
public class LiquibaseConfig {

    private final String businessSchemaName = "businessSchemaName";

    @Bean(name = "liquibaseDataSource")
    @ConfigurationProperties(prefix = "application.datasource.liquibase")
    public DataSource liquibaseDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    public SpringLiquibase liquibase(@Qualifier("liquibaseDataSource") DataSource liquibaseDataSource
            , LiquibaseProperties properties) {
        SpringLiquibase liquibase = new SpringLiquibase();

        liquibase.setDataSource(liquibaseDataSource);
        liquibase.setChangeLog(properties.changeLog());
        liquibase.setLiquibaseSchema(properties.liquibaseSchema());
        liquibase.setChangeLogParameters(Map.of(businessSchemaName, properties.defaultSchema()));
        // When no contexts are configured Liquibase runs every changeset (schema + demo seed)
        liquibase.setContexts(properties.contexts());

        return liquibase;
    }

    @ConfigurationProperties(prefix = "application.liquibase")
    public record LiquibaseProperties(
            String changeLog,
            String defaultSchema,
            String liquibaseSchema,
            String contexts
    ) {}
}
