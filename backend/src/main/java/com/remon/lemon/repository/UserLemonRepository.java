package com.remon.lemon.repository;

import com.remon.lemon.entity.UserLemon;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserLemonRepository extends JpaRepository<UserLemon, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UserLemon u WHERE u.userId = :userId")
    Optional<UserLemon> findByUserIdWithLock(@Param("userId") Long userId);
}
