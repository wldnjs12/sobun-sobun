package com.ppuri.sobunsobun.auth.service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 계정(회원가입·로그인) 실패. HTTP 상태와 code를 같이 들고 다녀서
 * GlobalExceptionHandler가 그대로 { success:false, code, message } 로 내려준다.
 */
@Getter
public class AccountException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AccountException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AccountException duplicateLoginId() {
        return new AccountException(HttpStatus.CONFLICT, "DUPLICATE_LOGIN_ID", "이미 사용 중인 아이디예요");
    }

    /** 아이디가 없을 때와 비밀번호가 틀릴 때 같은 문구를 쓴다 — 다르면 "이 아이디는 가입돼 있다"는 정보가 새어 나간다. */
    public static AccountException invalidCredentials() {
        return new AccountException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 맞지 않아요");
    }

    public static AccountException unauthorized() {
        return new AccountException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "로그인이 필요해요");
    }
}
