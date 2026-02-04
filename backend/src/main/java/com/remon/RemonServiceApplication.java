package com.remon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class RemonServiceApplication {


	public static void main(String[] args) {
		SpringApplication.run(RemonServiceApplication.class, args);
	}

}
