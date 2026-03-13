package com.remon.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 설정 분리
 *
 * @EnableJpaAuditing을 @SpringBootApplication과 같은 클래스에 두면
 * @WebMvcTest 환경에서 JPA 컨텍스트 없이 jpaAuditingHandler 빈을 생성하려다
 * "JPA metamodel must not be empty" 오류가 발생한다.
 *
 * @ConditionalOnBean(EntityManagerFactory.class) 를 통해
 * JPA가 실제로 초기화된 환경(운영, @SpringBootTest)에서만 활성화된다.
 */
@Configuration
@EnableJpaAuditing
@ConditionalOnBean(EntityManagerFactory.class)
public class JpaAuditingConfig {
}
