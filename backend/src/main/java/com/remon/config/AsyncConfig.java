package com.remon.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig implements AsyncConfigurer {

    public static final String BOOK_GENERATION_EXECUTOR = "bookGenerationExecutor";

    @Bean(name = BOOK_GENERATION_EXECUTOR)
    public ThreadPoolTaskExecutor bookGenerationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("book-gen-");
        // 종료 시 진행 중인 작업이 끝날 시간을 잠깐 준다 (못 끝낸 작업은 StaleGenerationRecoveryJob 이 환불 처리)
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return bookGenerationExecutor();
    }
}
