
package com.techmahindra.carddispute.common.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Card Dispute API",
                version = "1.0.0",
                description = """
                        Card Dispute Proof of Concept.

                        REST API for synthetic card transactions,
                        dispute submission and automatic dispute decisions.

                        Business processes are orchestrated by Camunda 7.

                        This API uses synthetic identities and does not
                        process real banking transactions.
                        """,
                contact = @Contact(
                        name = "Card Dispute POC Team"
                ),
                license = @License(
                        name = "Internal POC"
                )
        )
)
@SecurityScheme(
        name = "basicAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "basic",
        description = "HTTP Basic authentication using synthetic demo users."
)
public class OpenApiConfig {
}
