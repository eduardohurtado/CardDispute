
package com.techmahindra.carddispute.security.entity;

import com.techmahindra.carddispute.security.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppUser {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(
            name = "username",
            nullable = false,
            unique = true,
            length = 80
    )
    private String username;

    @Column(
            name = "password_hash",
            nullable = false,
            length = 255
    )
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "role",
            nullable = false,
            length = 32
    )
    private Role role;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private Instant createdAt;
}
