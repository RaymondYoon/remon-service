package com.remon.user.service;

import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder bCryptPasswordEncoder){
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    }

    public User login (String email, String password) {
        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (bCryptPasswordEncoder.matches(password, user.getPassword())) {
                return user;
            } else {
                throw new IllegalStateException("잘못된 비밀번호입니다.");
            }
        } else {
            throw new IllegalStateException("존재하지 않는 이메일입니다.");
        }
    }

    public User registerUser(String email, String password, String provider, String providerId, String nickname){
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            throw new IllegalStateException("이미 가입된 이메일 입니다.");
        }
        String encodedPassword = bCryptPasswordEncoder.encode(password);
        User user = User.builder()
                .email(email)
                .password(encodedPassword)
                .provider(provider)
                .providerId(providerId)
                .nickname(nickname)
                .role(Role.USER)
                .build();

        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByProviderAndProviderId(String provider, String providerID){
        return userRepository.findByProviderAndProviderId(provider, providerID);
    }

    public java.util.List<User> findAll(){
        return userRepository.findAll();
    }
}
