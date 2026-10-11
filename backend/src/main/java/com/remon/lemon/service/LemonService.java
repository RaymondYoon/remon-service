package com.remon.lemon.service;

import com.remon.exception.BusinessException;
import com.remon.exception.ErrorCode;
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

    static final int MAX_DAILY = 2;

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

    @Transactional
    public void consumeLemon(String email) {
        User user = findUser(email);
        Long userId = user.getId();

        // 비관적 락으로 조회 (동시 차감 방지)
        UserLemon lemon = userLemonRepository.findByUserIdWithLock(userId)
                .orElseGet(() -> userLemonRepository.save(
                        new UserLemon(userId, MAX_DAILY, LocalDate.now())));

        // 당일 충전 처리
        if (lemon.getLastChargeDate() == null || lemon.getLastChargeDate().isBefore(LocalDate.now())) {
            lemon.setLemonCount(MAX_DAILY);
            lemon.setLastChargeDate(LocalDate.now());
        }

        // 차감 전 잔량 재확인
        if (lemon.getLemonCount() < 1) {
            throw new BusinessException(ErrorCode.LEMON_INSUFFICIENT);
        }
        lemon.setLemonCount(lemon.getLemonCount() - 1);
    }

    /**
     * 생성 실패로 소모한 레몬 1개를 돌려준다.
     * 중복 환불 방지는 호출부(BookGenerationFailureService)의 lemon_refunded 플래그가 담당한다.
     *  - 오늘 충전분이 아니면(날짜가 지남) 다음 조회 시 어차피 최대치로 충전되므로 변경하지 않는다.
     *  - 하루 최대치(MAX_DAILY)를 넘기지 않는다.
     */
    public void refundLemon(Long userId) {
        userLemonRepository.findByUserIdWithLock(userId).ifPresent(lemon -> {
            if (lemon.getLastChargeDate() == null || lemon.getLastChargeDate().isBefore(LocalDate.now())) {
                return;
            }
            lemon.setLemonCount(Math.min(MAX_DAILY, lemon.getLemonCount() + 1));
        });
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
        return userRepository.getByEmail(email);
    }
}
