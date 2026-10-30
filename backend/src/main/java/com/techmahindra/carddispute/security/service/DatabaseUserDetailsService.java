package com.techmahindra.carddispute.security.service;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.security.entity.AppUser;
import com.techmahindra.carddispute.security.repository.AppUserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    @Override
    @Transactional(transactionManager = "cardDisputeTransactionManager", readOnly = true)
    public AuthenticatedUser loadUserByUsername(String username) {

        AppUser user =
                appUserRepository
                        .findByUsername(username)
                        .filter(AppUser::isEnabled)
                        .orElseThrow(
                                () -> new UsernameNotFoundException("User not found or disabled"));

        return new AuthenticatedUser(
                user.getUsername(), user.getPasswordHash(), user.getRole(), user.getCustomerId());
    }
}
