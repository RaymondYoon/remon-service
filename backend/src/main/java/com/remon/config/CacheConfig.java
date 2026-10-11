package com.remon.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * 캐시 활성화. 실제 CacheManager는 spring.cache.type 에 따라 결정된다.
 *  - redis (운영 기본값): RedisConfig 의 RedisCacheManager
 *  - none  (로컬/테스트): Spring Boot 기본 NoOpCacheManager
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
