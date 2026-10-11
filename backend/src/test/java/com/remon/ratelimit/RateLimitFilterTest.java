package com.remon.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private MockHttpServletRequest request(String xff) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/books");
        req.setRemoteAddr("10.0.0.1"); // 프록시 주소
        if (xff != null) req.addHeader("X-Forwarded-For", xff);
        return req;
    }

    @Test
    @DisplayName("클라이언트가 X-Forwarded-For 를 위조해도 신뢰 프록시가 붙인 맨 오른쪽 값을 사용한다")
    void extractClientIp_위조된_XFF_무시() {
        RateLimitFilter filter = new RateLimitFilter(1);

        assertThat(filter.extractClientIp(request("1.2.3.4, 203.0.113.7"))).isEqualTo("203.0.113.7");
        assertThat(filter.extractClientIp(request("203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("X-Forwarded-For 가 없으면 remoteAddr 사용")
    void extractClientIp_헤더_없음() {
        assertThat(new RateLimitFilter(1).extractClientIp(request(null))).isEqualTo("10.0.0.1");
    }

    @Test
    @DisplayName("신뢰 프록시 0개 설정이면 헤더를 무시하고 remoteAddr 사용")
    void extractClientIp_프록시_신뢰_안함() {
        assertThat(new RateLimitFilter(0).extractClientIp(request("1.2.3.4"))).isEqualTo("10.0.0.1");
    }

    @Test
    @DisplayName("XFF 맨 앞 값을 매번 바꿔도 같은 클라이언트로 집계돼 한도(60/분)를 넘으면 429")
    void doFilter_XFF_로테이션으로_우회_불가() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1);
        int lastStatus = 200;
        for (int i = 0; i < 61; i++) {
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(request("9.9.9." + i + ", 203.0.113.7"), res, new MockFilterChain());
            lastStatus = res.getStatus();
        }
        assertThat(lastStatus).isEqualTo(429);
    }
}
