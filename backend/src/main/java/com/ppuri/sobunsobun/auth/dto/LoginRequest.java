package com.ppuri.sobunsobun.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** 로그인 요청. 형식 검증은 하지 않는다 — 틀린 형식이어도 "아이디 또는 비밀번호가 맞지 않아요"로 똑같이 답한다. */
public record LoginRequest(
        @NotBlank(message = "아이디를 입력해 주세요") String loginId,
        @NotBlank(message = "비밀번호를 입력해 주세요") String password
) {
}
