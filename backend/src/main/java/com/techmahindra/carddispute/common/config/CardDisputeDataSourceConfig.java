package com.techmahindra.carddispute.common.config;

import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@EnableJpaRepositories(
        basePackages = "com.techmahindra.carddispute.*.repository",
        entityManagerFactoryRef = "cardDisputeEntityManagerFactory",
        transactionManagerRef = "cardDisputeTransactionManager")
public class CardDisputeDataSourceConfig {

    @Bean("cardDisputeDataSource")
    @ConfigurationProperties(prefix = "application.datasource.card-dispute")
    public DataSource cardDisputeDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "cardDisputeEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean cardDisputeEntityManagerFactory(
            @Qualifier("cardDisputeDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);

        em.setPackagesToScan("com.techmahindra.carddispute.*.entity");

        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Map<String, Object> properties = new HashMap<>();
        // Liquibase owns the business schema; Hibernate must not alter it
        properties.put("hibernate.hbm2ddl.auto", "none");
        // Instant <-> DATETIME2 stored as UTC
        properties.put("hibernate.type.preferred_instant_jdbc_type", "TIMESTAMP");
        properties.put("hibernate.jdbc.time_zone", "UTC");
        properties.put("hibernate.dialect", "org.hibernate.dialect.SQLServerDialect");
        properties.put("hibernate.default_schema", "card_dispute_business_schema");
        em.setJpaPropertyMap(properties);

        return em;
    }

    @Bean(name = "cardDisputeTransactionManager")
    public PlatformTransactionManager cardDisputeTransactionManager(
            @Qualifier("cardDisputeEntityManagerFactory")
                    LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory.getObject());
    }
}
