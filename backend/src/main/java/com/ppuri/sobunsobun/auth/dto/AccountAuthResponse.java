package com.ppuri.sobunsobun.auth.dto;

/** 회원가입·로그인 성공 응답. 프론트는 token을 저장해 두고 모든 요청에 Authorization: Bearer 로 붙인다. */
public record AccountAuthResponse(String token, Long userId, String nickname) {
}
