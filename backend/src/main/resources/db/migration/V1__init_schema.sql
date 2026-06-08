-- ============================================================
-- V1: 초기 스키마 생성 (Remon Service)
-- 모든 테이블은 IF NOT EXISTS로 멱등성 보장
-- ============================================================

CREATE TABLE IF NOT EXISTS `user` (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(255),
    provider       VARCHAR(255) NOT NULL,
    provider_id    VARCHAR(255),
    nickname       VARCHAR(255),
    role           VARCHAR(255) NOT NULL,
    created_at     DATETIME(6),
    email_verified TINYINT(1)   NOT NULL DEFAULT 0
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS book (
    id              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(255),
    author          VARCHAR(255),
    isbn            VARCHAR(255),
    cover_image_url TEXT,
    fileurl         VARCHAR(255),
    price           DOUBLE       NOT NULL DEFAULT 0,
    description     VARCHAR(255),
    published_date  DATE,
    published_by    BIGINT,
    content         TEXT,
    is_ai_generated TINYINT(1)   NOT NULL DEFAULT 0,
    genre           VARCHAR(255),
    tone            VARCHAR(255),
    status          VARCHAR(255) NOT NULL DEFAULT 'DONE',
    is_public       TINYINT(1)   NOT NULL DEFAULT 1,
    view_count      BIGINT                DEFAULT 0,
    INDEX idx_book_status    (status),
    INDEX idx_book_view_count (view_count DESC),
    INDEX idx_book_status_id (status, id DESC)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS user_books (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    book_id        BIGINT       NOT NULL,
    status         VARCHAR(255) NOT NULL DEFAULT 'SAVED',
    last_read_page INT          NOT NULL DEFAULT 0,
    saved_at       DATETIME(6)  NOT NULL,
    UNIQUE KEY uk_user_books_user_book (user_id, book_id),
    CONSTRAINT fk_user_books_user FOREIGN KEY (user_id) REFERENCES `user` (id),
    CONSTRAINT fk_user_books_book FOREIGN KEY (book_id) REFERENCES book (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
    id         BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    book_id    BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    rating     INT          NOT NULL,
    content    TEXT,
    created_at DATETIME(6),
    UNIQUE KEY uk_reviews_book_user (book_id, user_id),
    CONSTRAINT fk_reviews_book FOREIGN KEY (book_id) REFERENCES book (id),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES `user` (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS follows (
    id           BIGINT     NOT NULL AUTO_INCREMENT PRIMARY KEY,
    follower_id  BIGINT     NOT NULL,
    following_id BIGINT     NOT NULL,
    created_at   DATETIME(6),
    UNIQUE KEY uk_follows_follower_following (follower_id, following_id),
    CONSTRAINT fk_follows_follower  FOREIGN KEY (follower_id)  REFERENCES `user` (id),
    CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES `user` (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    receiver_id BIGINT       NOT NULL,
    sender_id   BIGINT       NOT NULL,
    type        VARCHAR(20)  NOT NULL,
    message     VARCHAR(255) NOT NULL,
    book_id     BIGINT,
    is_read     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME(6)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS user_lemons (
    user_id          BIGINT NOT NULL PRIMARY KEY,
    lemon_count      INT    NOT NULL DEFAULT 0,
    last_charge_date DATE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME(6)  NOT NULL
) ENGINE = InnoDB;
