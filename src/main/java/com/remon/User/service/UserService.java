package com.remon.User.service;

import com.remon.User.entity.Role;
import com.remon.User.entity.User;
import com.remon.User.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository){
        this.userRepository = userRepository;
    }

    public User registerUser(String email, String password, String provider, String providerId, String nickname){
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            throw new IllegalStateException("이미 가입된 이메일 입니다.");
        }

        User user = User.builder()
                .email(email)
                .password(password)
                .provider(provider)
                .providerId(providerId)
                .nickname(nickname)
                .role(Role.USER)
                .build();

        return userRepository.save(user);
    }
}
