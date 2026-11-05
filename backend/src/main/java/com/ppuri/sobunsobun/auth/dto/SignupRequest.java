package com.ppuri.sobunsobun.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 회원가입 요청. 검증 문구는 그대로 화면에 뜨므로 해요체로 쓴다. */
public record SignupRequest(
        @NotBlank(message = "아이디를 입력해 주세요")
        @Pattern(regexp = "^[a-z0-9]{4,20}$", message = "아이디는 영문 소문자·숫자 4~20자로 입력해 주세요")
        String loginId,

        // 72바이트를 넘으면 BCrypt가 뒷부분을 무시하므로 넉넉히 64자로 상한을 둔다
        @NotBlank(message = "비밀번호를 입력해 주세요")
        @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하로 입력해 주세요")
        String password,

        @NotBlank(message = "닉네임을 입력해 주세요")
        @Size(min = 2, max = 10, message = "닉네임은 2~10자로 입력해 주세요")
        String nickname
) {
}
