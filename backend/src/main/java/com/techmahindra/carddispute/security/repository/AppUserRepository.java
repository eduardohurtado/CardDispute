
package com.techmahindra.carddispute.security.repository;

import com.techmahindra.carddispute.security.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository
        extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByUsername(String username);
}
