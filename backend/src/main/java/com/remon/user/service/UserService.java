package com.remon.user.service;

import com.remon.book.repository.BookRepository;
import com.remon.library.repository.UserBookRepository;
import com.remon.logging.MaskingUtil;
import com.remon.user.entity.Role;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.IsoFields;
import java.util.Optional;

@Service
@Transactional
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final UserBookRepository userBookRepository;
    private final BookRepository bookRepository;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder bCryptPasswordEncoder,
                       UserBookRepository userBookRepository, BookRepository bookRepository){
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
        this.userBookRepository = userBookRepository;
        this.bookRepository = bookRepository;
    }

    public User login (String email, String password) {
        log.info("로그인 시도: {}", MaskingUtil.maskEmail(email));
        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (bCryptPasswordEncoder.matches(password, user.getPassword())) {
                log.info("로그인 성공: {}", MaskingUtil.maskEmail(email));
                return user;
            } else {
                log.warn("로그인 실패 - 비밀번호 불일치: {}", MaskingUtil.maskEmail(email));
                throw new IllegalStateException("잘못된 비밀번호입니다.");
            }
        } else {
            log.warn("로그인 실패 - 존재하지 않는 이메일: {}", MaskingUtil.maskEmail(email));
            throw new IllegalStateException("존재하지 않는 이메일입니다.");
        }
    }

    public User registerUser(String email, String password, String provider, String providerId, String nickname){
        log.info("회원가입 시도: {}", MaskingUtil.maskEmail(email));
        if (userRepository.existsByEmail(email)) {
            log.warn("회원가입 실패 - 이미 존재하는 이메일: {}", MaskingUtil.maskEmail(email));
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
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

        log.info("회원가입 완료: {}", MaskingUtil.maskEmail(email));
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByProviderAndProviderId(String provider, String providerID){
        return userRepository.findByProviderAndProviderId(provider, providerID);
    }

    public java.util.List<User> findAll(){
        return userRepository.findAll();
    }

    public void updateNickname(String email, String nickname) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        if (!user.getNickname().equals(nickname) && userRepository.existsByNickname(nickname)) {
            throw new IllegalStateException("이미 사용 중인 닉네임입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime changedAt = user.getNicknameChangedAt();

        if (changedAt != null) {
            boolean sameWeek = now.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) == changedAt.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                    && now.get(IsoFields.WEEK_BASED_YEAR) == changedAt.get(IsoFields.WEEK_BASED_YEAR);
            if (sameWeek) {
                if (user.getNicknameChangeCount() >= 2) {
                    throw new IllegalStateException("이번 주 닉네임 변경 횟수를 초과했습니다. (주 2회 제한)");
                }
                user.updateNickname(nickname);
            } else {
                user.resetNicknameCountAndUpdate(nickname);
            }
        } else {
            user.updateNickname(nickname);
        }

        bookRepository.updateAuthorByPublishedBy(user.getId(), nickname);
    }

    public void deleteAccount(String email) {
        log.info("회원 탈퇴 요청: {}", MaskingUtil.maskEmail(email));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        userBookRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
        log.info("회원 탈퇴 완료: {}", MaskingUtil.maskEmail(email));
    }
}
