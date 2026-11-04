package com.ppuri.sobunsobun.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ppuri.sobunsobun.auth.service.AccountSessionService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * 모든 /api 요청의 "로그인 확인" 담당 (2026-11 기획 개편: 계정 신규).
 *
 * 동작 순서:
 *  1) 공개 경로(회원가입·로그인·주소 검색)와 OPTIONS(브라우저의 CORS 사전 요청)는 그냥 통과
 *  2) 그 밖에는 Authorization: Bearer <토큰> 이 유효해야 통과. 아니면 401 + code "UNAUTHORIZED"
 *  3) 통과하면 요청을 감싸서(wrapper) X-User-Id 헤더와 userId/hostUserId 파라미터를 "토큰 주인 id"로 바꿔치기한다.
 *
 * 왜 바꿔치기하나: 기존 컨트롤러들은 @RequestHeader("X-User-Id") 나 @RequestParam userId 로 "나"를 받는다.
 * 로그인이 없던 시절 코드라 클라이언트가 아무 숫자나 보내면 남인 척할 수 있었다.
 * 컨트롤러를 전부 고치는 대신, 여기서 값을 서버가 확인한 값으로 덮어쓰면 기존 코드는 그대로 안전해진다.
 *
 * @Component가 아니라 SessionAuthFilterConfig에서 등록한다 — @WebMvcTest(웹 계층만 띄우는 테스트)가
 * 이 필터를 자동으로 끼워 넣어서 기존 컨트롤러 테스트가 전부 401이 되는 걸 막기 위해서.
 */
public class SessionAuthFilter extends OncePerRequestFilter {

    public static final String USER_ID_HEADER = "X-User-Id";
    /** 이 파라미터 이름들은 항상 "로그인한 나"를 뜻하므로 토큰 주인 id로 덮어쓴다. */
    static final Set<String> SELF_PARAMS = Set.of("userId", "hostUserId");
    static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/account/signup",
            "/api/account/login",
            "/api/auth/addresses/search");

    private final AccountSessionService sessionService;
    private final ObjectMapper objectMapper;
    private final Set<String> allowedOrigins;

    public SessionAuthFilter(AccountSessionService sessionService, ObjectMapper objectMapper, Collection<String> allowedOrigins) {
        this.sessionService = sessionService;
        this.objectMapper = objectMapper;
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || PUBLIC_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        Optional<Long> accountId = sessionService.resolveAccountId(extractBearer(request.getHeader(HttpHeaders.AUTHORIZATION)));
        if (accountId.isEmpty()) {
            writeUnauthorized(request, response);
            return;
        }
        chain.doFilter(new AuthenticatedRequest(request, accountId.get()), response);
    }

    /** "Bearer abc" → "abc". 형식이 다르면 null. */
    public static String extractBearer(String authorization) {
        if (authorization == null) return null;
        String prefix = "Bearer ";
        if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) return null;
        String token = authorization.substring(prefix.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // 이 응답은 Spring MVC(CorsConfig)까지 가지 않고 여기서 끝나므로 CORS 헤더를 직접 붙인다.
        // 안 붙이면 브라우저가 401 내용을 못 읽게 막아서, 프론트는 "서버 연결 실패"로만 보게 된다.
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null && allowedOrigins.contains(origin)) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.fail("UNAUTHORIZED", "로그인이 필요해요")));
    }

    /** X-User-Id 헤더와 userId/hostUserId 파라미터만 토큰 주인 id로 보이게 하는 요청 포장지. */
    static class AuthenticatedRequest extends HttpServletRequestWrapper {

        private final String userId;
        private final Map<String, String[]> parameterMap;

        AuthenticatedRequest(HttpServletRequest request, Long accountId) {
            super(request);
            this.userId = String.valueOf(accountId);
            Map<String, String[]> params = new LinkedHashMap<>(request.getParameterMap());
            // 클라이언트가 안 보냈어도 넣어준다 → 프론트가 ?userId= 를 빼도 기존 컨트롤러가 동작
            SELF_PARAMS.forEach(name -> params.put(name, new String[]{userId}));
            this.parameterMap = Collections.unmodifiableMap(params);
        }

        @Override
        public String getHeader(String name) {
            return USER_ID_HEADER.equalsIgnoreCase(name) ? userId : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            return USER_ID_HEADER.equalsIgnoreCase(name)
                    ? Collections.enumeration(List.of(userId))
                    : super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = new ArrayList<>();
            Enumeration<String> original = super.getHeaderNames();
            while (original != null && original.hasMoreElements()) {
                String name = original.nextElement();
                if (!USER_ID_HEADER.equalsIgnoreCase(name)) names.add(name); // 클라이언트가 보낸 건 빼고
            }
            names.add(USER_ID_HEADER); // 서버가 정한 값 하나만
            return Collections.enumeration(names);
        }

        @Override
        public String getParameter(String name) {
            String[] values = parameterMap.get(name);
            return values == null || values.length == 0 ? null : values[0];
        }

        @Override
        public String[] getParameterValues(String name) {
            String[] values = parameterMap.get(name);
            return values == null ? null : values.clone();
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return parameterMap;
        }

        @Override
        public Enumeration<String> getParameterNames() {
            return Collections.enumeration(parameterMap.keySet());
        }
    }
}
