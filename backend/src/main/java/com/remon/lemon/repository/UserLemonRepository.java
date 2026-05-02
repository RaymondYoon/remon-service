package com.remon.lemon.repository;

import com.remon.lemon.entity.UserLemon;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLemonRepository extends JpaRepository<UserLemon, Long> {
}
