package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.dto.AccountAuthResponse;
import com.ppuri.sobunsobun.auth.service.AccountException;
import com.ppuri.sobunsobun.auth.service.AccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 웹 계층만: 응답 형식(ApiResponse)·상태 코드·검증 문구 확인. 로그인 필터는 SessionAuthFilterTest에서 따로 본다. */
@WebMvcTest(AccountController.class)
class AccountControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AccountService accountService;

    @Test
    void 가입_성공하면_토큰과_userId() throws Exception {
        given(accountService.signup(any())).willReturn(new AccountAuthResponse("tok", 5L, "이웃"));

        mockMvc.perform(post("/api/account/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"neighbor1\",\"password\":\"password123\",\"nickname\":\"이웃\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("tok"))
                .andExpect(jsonPath("$.data.userId").value(5));
    }

    @Test
    void 아이디_형식이_틀리면_400과_한국어_문구() throws Exception {
        mockMvc.perform(post("/api/account/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"AB\",\"password\":\"password123\",\"nickname\":\"이웃\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("아이디는 영문 소문자·숫자 4~20자로 입력해 주세요"));
    }

    @Test
    void 아이디_중복이면_409_DUPLICATE_LOGIN_ID() throws Exception {
        given(accountService.signup(any())).willThrow(AccountException.duplicateLoginId());

        mockMvc.perform(post("/api/account/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"neighbor1\",\"password\":\"password123\",\"nickname\":\"이웃\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_LOGIN_ID"));
    }

    @Test
    void 로그인_실패면_401_INVALID_CREDENTIALS() throws Exception {
        given(accountService.login(any())).willThrow(AccountException.invalidCredentials());

        mockMvc.perform(post("/api/account/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"neighbor1\",\"password\":\"wrong-pass\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("아이디 또는 비밀번호가 맞지 않아요"));
    }
}
