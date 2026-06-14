package com.remon.user.repository;

import com.remon.user.entity.OAuthCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OAuthCodeRepository extends JpaRepository<OAuthCode, Long> {

    Optional<OAuthCode> findByCode(String code);

    void deleteByEmail(String email);

    void deleteByExpiresAtBefore(LocalDateTime now);
}
