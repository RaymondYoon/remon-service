# [Remon] 비관적 락으로 AI 책 생성 레몬 중복 차감 방지하기

Remon에서는 사용자가 AI 책 생성을 요청할 때 레몬을 1개 차감한다.

하루에 사용할 수 있는 레몬의 개수는 제한되어 있고, 레몬이 남아 있을 때만 책 생성 요청을 진행할 수 있다. 처음에는 단순히 레몬 개수를 조회하고 1을 빼는 방식으로 생각했지만, 요청이 동시에 들어오는 경우를 생각해 보니 동시성 문제가 발생할 수 있었다.

이번 글에서는 Remon의 AI 책 생성 기능에서 발생할 수 있는 레몬 중복 차감 문제를 비관적 락으로 해결한 과정을 정리한다.

---

## 1. 문제 상황

사용자에게 레몬이 1개 남아 있는 상황을 생각해 보자.

사용자가 생성 버튼을 빠르게 두 번 누르거나, 여러 기기에서 동시에 생성 요청을 보내면 서버에는 거의 같은 시점에 두 요청이 도착할 수 있다.

```text
현재 레몬: 1개

요청 A: 레몬 1개 조회 → 차감 가능
요청 B: 레몬 1개 조회 → 차감 가능

요청 A: 레몬 0개로 변경 → 책 생성 시작
요청 B: 레몬 0개로 변경 → 책 생성 시작
```

결과적으로 레몬은 한 번만 차감된 것처럼 보이지만, 책 생성은 두 번 실행될 수 있다.

이 문제는 이전 글에서 다뤘던 **Lost Update(갱신 손실)**와 같은 흐름에서 발생한다. 두 트랜잭션이 같은 값을 읽고 각각 수정한 뒤, 나중에 커밋된 결과가 앞선 변경을 덮어쓰는 것이다.

---

## 2. 기존의 단순한 차감 방식

락 없이 구현하면 보통 아래와 같은 코드가 된다.

```java
@Transactional
public void consumeLemon(Long userId) {
    UserLemon lemon = userLemonRepository.findById(userId)
            .orElseThrow();

    if (lemon.getLemonCount() < 1) {
        throw new IllegalStateException("레몬이 부족합니다.");
    }

    lemon.setLemonCount(lemon.getLemonCount() - 1);
}
```

코드 자체는 단순하다. 하지만 `findById()`로 레몬을 읽은 시점과 트랜잭션이 커밋되어 `UPDATE` 쿼리가 나가는 시점 사이에 다른 요청이 들어올 수 있다.

레몬처럼 여러 요청이 같은 사용자 데이터를 동시에 수정할 수 있고, 초과 사용이 발생하면 안 되는 값은 동시성 제어가 필요하다.

---

## 3. 비관적 락 적용

Remon에서는 레몬을 조회할 때 `PESSIMISTIC_WRITE`를 적용했다.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT u FROM UserLemon u WHERE u.userId = :userId")
Optional<UserLemon> findByUserIdWithLock(@Param("userId") Long userId);
```

`PESSIMISTIC_WRITE`는 데이터를 읽는 순간 해당 행에 쓰기 락을 건다.

먼저 요청한 트랜잭션이 끝날 때까지, 뒤에 도착한 요청은 같은 레몬 행을 수정하지 못하고 대기한다.

실제 레몬 차감 로직은 다음과 같다.

```java
@Transactional
public void consumeLemon(String email) {
    User user = findUser(email);

    UserLemon lemon = userLemonRepository.findByUserIdWithLock(user.getId())
            .orElseGet(() -> userLemonRepository.save(
                    new UserLemon(user.getId(), MAX_DAILY, LocalDate.now())));

    if (lemon.getLastChargeDate() == null
            || lemon.getLastChargeDate().isBefore(LocalDate.now())) {
        lemon.setLemonCount(MAX_DAILY);
        lemon.setLastChargeDate(LocalDate.now());
    }

    if (lemon.getLemonCount() < 1) {
        throw new BusinessException(ErrorCode.LEMON_INSUFFICIENT);
    }

    lemon.setLemonCount(lemon.getLemonCount() - 1);
}
```

이제 레몬이 1개인 상태에서 요청이 두 번 들어오면 다음과 같이 동작한다.

```text
현재 레몬: 1개

요청 A: 레몬 행에 쓰기 락 획득 → 1개 차감 → 0개 → 커밋
요청 B: 요청 A가 끝날 때까지 대기
요청 B: 레몬 0개 확인 → 레몬 부족 예외 발생
```

두 번째 요청은 첫 번째 요청이 반영한 최신 값을 조회하게 된다. 따라서 레몬 1개로 책이 두 번 생성되는 문제를 막을 수 있다.

---

## 4. 왜 낙관적 락이 아닌 비관적 락을 선택했을까?

레몬 차감은 사용자 한 명이 짧은 시간에 반복 요청할 수 있는 기능이다. 생성 버튼의 중복 클릭, 네트워크 재시도, 여러 기기에서의 요청처럼 충돌이 발생할 수 있는 경우도 비교적 명확하다.

낙관적 락을 사용하면 충돌이 발생한 요청은 예외가 발생하고, 애플리케이션에서 재시도 처리를 해야 한다. 하지만 레몬 차감은 재시도보다 먼저 들어온 요청을 처리하고 나머지 요청을 대기시키는 방식이 더 단순하고 안전하다고 판단했다.

또한 잠그는 대상은 전체 테이블이 아니라 사용자 한 명의 레몬 행이다. 서로 다른 사용자의 생성 요청은 각각 다른 행을 사용하므로 동시에 처리할 수 있다.

```text
사용자 A의 레몬 행 잠금 ─ 사용자 A의 요청만 대기
사용자 B의 레몬 행 잠금 ─ 사용자 B의 요청만 대기
```

---

## 5. 책 생성 실패 시에도 레몬은 한 번만 환불되어야 한다

AI 책 생성은 비동기로 실행된다. 따라서 생성 API 오류, 작업 큐 포화, 서버 재시작 등 여러 경로에서 실패 처리와 레몬 환불이 발생할 수 있다.

이때 실패 처리 로직이 두 번 실행되면 레몬도 두 번 환불될 수 있다. 이를 막기 위해 `book` 테이블에 `lemon_refunded` 컬럼을 두고, 아직 환불되지 않은 경우에만 값을 변경하는 조건부 `UPDATE`를 사용했다.

```java
@Modifying
@Transactional
@Query("""
    UPDATE Book b
    SET b.lemonRefunded = true
    WHERE b.id = :id
      AND b.status = 'FAILED'
      AND b.lemonRefunded = false
    """)
int markLemonRefunded(@Param("id") Long id);
```

```java
@Transactional
public boolean failAndRefund(Long bookId) {
    bookRepository.transitionStatus(
            bookId,
            List.of(BookStatus.PENDING, BookStatus.GENERATING),
            BookStatus.FAILED
    );

    if (bookRepository.markLemonRefunded(bookId) == 0) {
        return false;
    }

    Long publisherId = bookRepository.findPublisherId(bookId).orElse(null);
    if (publisherId == null) {
        return false;
    }

    lemonService.refundLemon(publisherId);
    return true;
}
```

여러 실패 처리 경로가 동시에 실행되더라도, `lemon_refunded = false`인 상태를 먼저 변경한 요청만 환불을 진행한다.

```text
실패 처리 A: lemon_refunded = false → true 변경 성공 → 환불 진행
실패 처리 B: lemon_refunded = false 조건 불일치 → 변경 행 0개 → 환불하지 않음
```

상태 전이와 환불 여부를 조건으로 함께 확인했기 때문에, 이미 완료된 책을 실패 상태로 바꾸거나 같은 책의 레몬을 두 번 환불하는 문제를 방지할 수 있다.

---

## 6. 테스트

레몬이 1개인 상태에서 두 요청을 동시에 시작하도록 `CountDownLatch`를 사용해 테스트했다.

```java
CountDownLatch startLatch = new CountDownLatch(1);
CountDownLatch doneLatch = new CountDownLatch(2);

for (int i = 0; i < 2; i++) {
    new Thread(() -> {
        try {
            startLatch.await();
            lemonService.consumeLemon("user@test.com");
        } finally {
            doneLatch.countDown();
        }
    }).start();
}

startLatch.countDown();
doneLatch.await(5, TimeUnit.SECONDS);
```

확인한 기준은 다음과 같다.

* 레몬 개수가 음수가 되지 않는가
* 레몬이 1개라면 생성 요청은 최대 한 건만 성공하는가
* 실패 처리 로직이 여러 번 실행되어도 환불은 한 번만 되는가

---

## 7. 정리

AI 책 생성 기능에서 레몬은 단순한 숫자 값이 아니라, 사용자가 사용할 수 있는 제한된 자원이다.

동시 요청 상황에서 레몬 차감이 정확하지 않으면 레몬보다 많은 책이 생성되거나, 실패한 작업에서 중복 환불이 발생할 수 있다.

Remon에서는 다음 두 가지 방식으로 이를 제어했다.

* 레몬 차감 시 사용자별 행에 비관적 락을 적용해 요청을 직렬화했다.
* 생성 실패 환불 시 조건부 `UPDATE`를 사용해 한 번만 환불되도록 했다.

동시성 문제는 평소에는 잘 드러나지 않는다. 하지만 비용, 재고, 포인트처럼 정확성이 중요한 데이터에서는 처음부터 어떤 요청들이 동시에 들어올 수 있는지 생각하고, 데이터 특성에 맞는 제어 방식을 선택해야 한다.

