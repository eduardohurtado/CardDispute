package com.techmahindra.carddispute.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class CamundaDataSourceConfig {

    @Primary
    @Bean("camundaDataSource")
    @ConfigurationProperties(prefix = "application.datasource.camunda")
    public DataSource camundaDataSource() {
        return DataSourceBuilder.create().build();
    }


}
