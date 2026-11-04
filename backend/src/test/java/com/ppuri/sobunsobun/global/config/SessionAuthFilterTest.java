package com.ppuri.sobunsobun.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ppuri.sobunsobun.auth.service.AccountSessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SessionAuthFilterTest {

    private final AccountSessionService sessionService = mock(AccountSessionService.class);
    private final SessionAuthFilter filter = new SessionAuthFilter(
            sessionService, new ObjectMapper(), List.of("http://localhost:5173"));

    @Test
    void 토큰_없이_보호된_API를_부르면_401_UNAUTHORIZED_JSON_그리고_CORS_헤더() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/pods");
        req.addHeader("Origin", "http://localhost:5173");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(401);
        assertThat(res.getContentAsString())
                .contains("\"success\":false")
                .contains("\"code\":\"UNAUTHORIZED\"")
                .contains("로그인이 필요해요");
        assertThat(res.getHeader("Access-Control-Allow-Origin")).isEqualTo("http://localhost:5173");
        assertThat(chain.getRequest()).isNull(); // 컨트롤러까지 가지 않았다
    }

    @Test
    void 공개_경로와_OPTIONS는_토큰_없이_통과() throws Exception {
        for (MockHttpServletRequest req : List.of(
                new MockHttpServletRequest("POST", "/api/account/login"),
                new MockHttpServletRequest("POST", "/api/account/signup"),
                new MockHttpServletRequest("GET", "/api/auth/addresses/search"),
                new MockHttpServletRequest("OPTIONS", "/api/pods"))) {
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(req, new MockHttpServletResponse(), chain);
            assertThat(chain.getRequest()).as(req.getRequestURI()).isNotNull();
        }
    }

    @Test
    void 잘못된_토큰은_401() throws Exception {
        given(sessionService.resolveAccountId(any())).willReturn(Optional.empty());
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/account/me");
        req.addHeader("Authorization", "Bearer nope");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, new MockFilterChain());

        assertThat(res.getStatus()).isEqualTo(401);
    }

    @Test
    void 유효한_토큰이면_클라이언트가_보낸_X_User_Id와_userId_파라미터를_토큰_주인으로_덮어쓴다() throws Exception {
        given(sessionService.resolveAccountId("good")).willReturn(Optional.of(7L));
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/pods/1");
        req.addHeader("Authorization", "Bearer good");
        req.addHeader("X-User-Id", "1"); // 남인 척 시도
        req.addParameter("userId", "1");
        req.addParameter("podId", "3");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, new MockHttpServletResponse(), chain);

        HttpServletRequest passed = (HttpServletRequest) chain.getRequest();
        assertThat(passed.getHeader("X-User-Id")).isEqualTo("7");
        assertThat(passed.getHeader("x-user-id")).isEqualTo("7");
        assertThat(Collections.list(passed.getHeaders("X-User-Id"))).containsExactly("7");
        assertThat(Collections.list(passed.getHeaderNames()).stream().filter("X-User-Id"::equalsIgnoreCase)).hasSize(1);
        assertThat(passed.getParameter("userId")).isEqualTo("7");
        assertThat(passed.getParameterValues("userId")).containsExactly("7");
        assertThat(passed.getParameter("hostUserId")).isEqualTo("7"); // 안 보냈어도 채워진다
        assertThat(passed.getParameter("podId")).isEqualTo("3"); // 다른 파라미터는 그대로
        assertThat(passed.getParameterMap().get("userId")).containsExactly("7");
    }

    @Test
    void Bearer_파싱() {
        assertThat(SessionAuthFilter.extractBearer("Bearer abc")).isEqualTo("abc");
        assertThat(SessionAuthFilter.extractBearer("bearer abc")).isEqualTo("abc");
        assertThat(SessionAuthFilter.extractBearer("Basic abc")).isNull();
        assertThat(SessionAuthFilter.extractBearer("Bearer ")).isNull();
        assertThat(SessionAuthFilter.extractBearer(null)).isNull();
    }
}
