package com.remon.user.repository;

import com.remon.exception.UserNotFoundException;
import com.remon.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    /** 이메일로 사용자 조회 — 없으면 UserNotFoundException(404) */
    default User getByEmail(String email) {
        return findByEmail(email).orElseThrow(UserNotFoundException::new);
    }

    Optional<User> findByProviderAndProviderId(String provider, String providerId);
    boolean existsByEmail(String email);
    boolean existsByNickname(String nickname);
}
