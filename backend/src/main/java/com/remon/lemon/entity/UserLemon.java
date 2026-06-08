package com.remon.lemon.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "user_lemon")
public class UserLemon {

    @Id
    private Long userId;

    @Column(nullable = false)
    private int lemonCount;

    private LocalDate lastChargeDate;

    protected UserLemon() {}

    public UserLemon(Long userId, int lemonCount, LocalDate lastChargeDate) {
        this.userId = userId;
        this.lemonCount = lemonCount;
        this.lastChargeDate = lastChargeDate;
    }

    public Long getUserId() { return userId; }
    public int getLemonCount() { return lemonCount; }
    public LocalDate getLastChargeDate() { return lastChargeDate; }

    public void setLemonCount(int lemonCount) { this.lemonCount = lemonCount; }
    public void setLastChargeDate(LocalDate lastChargeDate) { this.lastChargeDate = lastChargeDate; }
}
