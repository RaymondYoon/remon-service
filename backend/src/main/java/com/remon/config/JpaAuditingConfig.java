package com.remon.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 설정 분리
 *
 * @EnableJpaAuditing을 @SpringBootApplication과 같은 클래스에 두면
 * @WebMvcTest 환경에서 JPA 컨텍스트 없이 jpaAuditingHandler 빈을 생성하려다
 * "JPA metamodel must not be empty" 오류가 발생한다.
 *
 * 이 문제는 @WebMvcTest 쪽에서 @MockitoBean JpaMetamodelMappingContext 를 선언해
 * 해결한다. @ConditionalOnBean 은 사용자 정의 @Configuration 에서 평가 순서를
 * 보장할 수 없어 운영 환경에서 @EnableJpaAuditing 이 비활성화되는 원인이 됐다.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
