package com.remon.lemon.service;

import com.remon.lemon.dto.LemonResponse;
import com.remon.lemon.entity.UserLemon;
import com.remon.lemon.repository.UserLemonRepository;
import com.remon.user.entity.User;
import com.remon.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional
public class LemonService {

    static final int MAX_DAILY = 3;

    private final UserLemonRepository userLemonRepository;
    private final UserRepository userRepository;

    public LemonService(UserLemonRepository userLemonRepository, UserRepository userRepository) {
        this.userLemonRepository = userLemonRepository;
        this.userRepository = userRepository;
    }

    public LemonResponse getLemonInfo(String email) {
        User user = findUser(email);
        UserLemon lemon = getOrCreateAndCharge(user.getId());
        int used = MAX_DAILY - lemon.getLemonCount();
        return new LemonResponse(lemon.getLemonCount(), MAX_DAILY, Math.max(0, used));
    }

    public void consumeLemon(String email) {
        User user = findUser(email);
        UserLemon lemon = getOrCreateAndCharge(user.getId());
        if (lemon.getLemonCount() <= 0) {
            throw new IllegalStateException("레몬이 부족합니다. 내일 다시 충전됩니다.");
        }
        lemon.setLemonCount(lemon.getLemonCount() - 1);
    }

    private UserLemon getOrCreateAndCharge(Long userId) {
        UserLemon lemon = userLemonRepository.findById(userId)
                .orElseGet(() -> userLemonRepository.save(
                        new UserLemon(userId, MAX_DAILY, LocalDate.now())));
        if (lemon.getLastChargeDate() == null || lemon.getLastChargeDate().isBefore(LocalDate.now())) {
            lemon.setLemonCount(MAX_DAILY);
            lemon.setLastChargeDate(LocalDate.now());
        }
        return lemon;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }
}
