-- 생성 실패 환불 / 멈춘 생성 복구를 위한 컬럼
--  created_at     : 생성 요청 시각 (기존 행은 마이그레이션 시각으로 채워짐)
--  lemon_refunded : 레몬 환불 완료 여부 (중복 환불 방지)
ALTER TABLE book
    ADD COLUMN created_at     DATETIME(6) NULL     DEFAULT CURRENT_TIMESTAMP(6),
    ADD COLUMN lemon_refunded TINYINT(1)  NOT NULL DEFAULT 0;

CREATE INDEX idx_book_status_created_at ON book (status, created_at);
