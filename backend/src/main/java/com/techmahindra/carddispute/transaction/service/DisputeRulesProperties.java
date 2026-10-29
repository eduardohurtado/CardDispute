package com.techmahindra.carddispute.transaction.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Synthetic POC rules (not real bank policy), bound from {@code application.dispute.rules}.
 *
 * @param eligibilityWindow max time between posting and dispute submission (60 days)
 * @param duplicateMatchWindow max time between charges for a strong duplicate match (1 hour)
 * @param reviewMatchWindow max time between charges still worth an analyst review
 * @param highValueThresholds per-currency amount above which a match always goes to an analyst
 */
@ConfigurationProperties(prefix = "application.dispute.rules")
public record DisputeRulesProperties(
        Duration eligibilityWindow,
        Duration duplicateMatchWindow,
        Duration reviewMatchWindow,
        Map<String, BigDecimal> highValueThresholds) {

    public DisputeRulesProperties {
        highValueThresholds =
                highValueThresholds == null ? Map.of() : Map.copyOf(highValueThresholds);
    }

    public Optional<BigDecimal> highValueThreshold(String currency) {
        return Optional.ofNullable(highValueThresholds.get(currency));
    }
}
