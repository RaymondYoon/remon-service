package com.remon.lemon.dto;

public class LemonResponse {

    private final int lemonCount;
    private final int maxDaily;
    private final int usedToday;

    public LemonResponse(int lemonCount, int maxDaily, int usedToday) {
        this.lemonCount = lemonCount;
        this.maxDaily = maxDaily;
        this.usedToday = usedToday;
    }

    public int getLemonCount() { return lemonCount; }
    public int getMaxDaily() { return maxDaily; }
    public int getUsedToday() { return usedToday; }
}
