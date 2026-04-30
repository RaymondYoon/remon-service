package com.remon.follow.repository;

import com.remon.follow.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    List<Follow> findByFollowingId(Long followingId);

    List<Follow> findByFollowerId(Long followerId);

    long countByFollowingId(Long userId);

    long countByFollowerId(Long userId);

    @Query("SELECT f.following.id FROM Follow f WHERE f.follower.id = :followerId")
    List<Long> findFollowingIds(@Param("followerId") Long followerId);
}
