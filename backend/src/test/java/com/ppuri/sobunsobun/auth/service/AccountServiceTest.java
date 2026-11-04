package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Account;
import com.ppuri.sobunsobun.auth.domain.AccountRepository;
import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.AccountAuthResponse;
import com.ppuri.sobunsobun.auth.dto.LoginRequest;
import com.ppuri.sobunsobun.auth.dto.MeResponse;
import com.ppuri.sobunsobun.auth.dto.SignupRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private AccountSessionService sessionService;
    @Mock private UserRepository userRepository;
    @Mock private BuildingRepository buildingRepository;

    @InjectMocks private AccountService accountService;

    private Account savedAccount(String loginId, String rawPassword) {
        Account account = new Account(loginId, new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(rawPassword), "이웃");
        ReflectionTestUtils.setField(account, "id", 5L);
        return account;
    }

    @Test
    void 가입하면_비밀번호는_해시로_저장되고_바로_토큰이_발급된다() {
        given(accountRepository.existsByLoginId("neighbor1")).willReturn(false);
        given(accountRepository.saveAndFlush(any(Account.class))).willAnswer(inv -> {
            Account a = inv.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 5L);
            return a;
        });
        given(sessionService.issue(5L)).willReturn("tok");

        AccountAuthResponse res = accountService.signup(new SignupRequest("neighbor1", "password123", " 이웃 "));

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo("password123").startsWith("$2");
        assertThat(captor.getValue().getNickname()).isEqualTo("이웃");
        assertThat(res).isEqualTo(new AccountAuthResponse("tok", 5L, "이웃"));
    }

    @Test
    void 이미_있는_아이디로_가입하면_DUPLICATE_LOGIN_ID() {
        given(accountRepository.existsByLoginId("neighbor1")).willReturn(true);

        assertThatThrownBy(() -> accountService.signup(new SignupRequest("neighbor1", "password123", "이웃")))
                .isInstanceOf(AccountException.class)
                .hasFieldOrPropertyWithValue("code", "DUPLICATE_LOGIN_ID");
        verify(accountRepository, never()).saveAndFlush(any());
    }

    @Test
    void 비밀번호가_맞으면_로그인되고_토큰을_준다() {
        given(accountRepository.findByLoginId("neighbor1")).willReturn(Optional.of(savedAccount("neighbor1", "password123")));
        given(sessionService.issue(5L)).willReturn("tok");

        assertThat(accountService.login(new LoginRequest("neighbor1", "password123")).token()).isEqualTo("tok");
    }

    @Test
    void 비밀번호가_틀려도_아이디가_없어도_같은_INVALID_CREDENTIALS() {
        given(accountRepository.findByLoginId("neighbor1")).willReturn(Optional.of(savedAccount("neighbor1", "password123")));
        given(accountRepository.findByLoginId("nobody")).willReturn(Optional.empty());

        AccountException wrongPw = org.junit.jupiter.api.Assertions.assertThrows(AccountException.class,
                () -> accountService.login(new LoginRequest("neighbor1", "wrong-password")));
        AccountException unknown = org.junit.jupiter.api.Assertions.assertThrows(AccountException.class,
                () -> accountService.login(new LoginRequest("nobody", "password123")));

        assertThat(wrongPw.getCode()).isEqualTo("INVALID_CREDENTIALS");
        assertThat(wrongPw.getMessage()).isEqualTo(unknown.getMessage());
        assertThat(unknown.getCode()).isEqualTo("INVALID_CREDENTIALS");
        verify(sessionService, never()).issue(any());
    }

    @Test
    void 내_정보에_등록한_건물과_법정동이_담긴다_건물명이_없으면_도로명_건물번호() {
        given(accountRepository.findById(5L)).willReturn(Optional.of(savedAccount("neighbor1", "password123")));
        given(userRepository.findById(5L)).willReturn(Optional.of(new User(5L, 9L)));
        Building building = new Building("", "인천광역시 미추홀구 인하로67번길 3 (용현동)", "bd-1", null, "bd-1", 37.0, 126.0);
        ReflectionTestUtils.setField(building, "id", 9L);
        given(buildingRepository.findById(9L)).willReturn(Optional.of(building));

        MeResponse me = accountService.me(5L);

        assertThat(me.loginId()).isEqualTo("neighbor1");
        assertThat(me.building().buildingId()).isEqualTo(9L);
        assertThat(me.building().buildingName()).isEqualTo("인하로67번길 3");
        assertThat(me.building().neighborhoodName()).isEqualTo("용현동");
    }

    @Test
    void 건물_등록_전이면_building은_null() {
        given(accountRepository.findById(5L)).willReturn(Optional.of(savedAccount("neighbor1", "password123")));
        given(userRepository.findById(5L)).willReturn(Optional.empty());

        assertThat(accountService.me(5L).building()).isNull();
    }

    @Test
    void 표시명_규칙() {
        assertThat(AccountService.displayName("제니스빌", "인하로 100 (용현동)")).isEqualTo("제니스빌");
        assertThat(AccountService.displayName(null, "인천광역시 미추홀구 매소홀로 220-1 (학익동)")).isEqualTo("매소홀로 220-1");
    }
}
