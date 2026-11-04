package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.dto.AccountAuthResponse;
import com.ppuri.sobunsobun.auth.dto.LoginRequest;
import com.ppuri.sobunsobun.auth.dto.MeResponse;
import com.ppuri.sobunsobun.auth.dto.SignupRequest;
import com.ppuri.sobunsobun.auth.service.AccountService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.global.config.SessionAuthFilter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

/**
 * 계정: 회원가입 · 로그인 · 내 정보 · 로그아웃.
 * signup/login은 토큰 없이 부를 수 있고(SessionAuthFilter의 공개 경로), 나머지는 로그인 필요.
 * X-User-Id는 클라이언트가 보낸 값이 아니라 필터가 토큰에서 꺼내 채워 넣은 값이다.
 */
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/signup")
    public ApiResponse<AccountAuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.ok(accountService.signup(request));
    }

    @PostMapping("/login")
    public ApiResponse<AccountAuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(accountService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@RequestHeader("X-User-Id") Long userId) {
        return ApiResponse.ok(accountService.me(userId));
    }

    /** 로그아웃: 지금 쓰는 토큰을 DB에서 지운다 → 같은 토큰으로는 더 이상 요청이 통과하지 않는다. */
    @DeleteMapping("/session")
    public ApiResponse<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        accountService.logout(SessionAuthFilter.extractBearer(authorization));
        return ApiResponse.ok(null);
    }

    /** @Valid 검증 실패 → 첫 번째 에러 문구만 내려준다 (AuthController와 같은 방식) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidRequest(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않아요");
        return ApiResponse.fail("INVALID_INPUT", message);
    }
}
