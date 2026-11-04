package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.SessionToken;
import com.ppuri.sobunsobun.auth.domain.SessionTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccountSessionServiceTest {

    @Mock private SessionTokenRepository repository;
    @InjectMocks private AccountSessionService sessionService;

    @Test
    void 발급한_토큰은_DB에_원문이_아니라_해시로_저장되고_30일_뒤_만료된다() {
        String token = sessionService.issue(5L);

        ArgumentCaptor<SessionToken> captor = ArgumentCaptor.forClass(SessionToken.class);
        verify(repository).save(captor.capture());
        SessionToken saved = captor.getValue();
        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+"); // 32바이트 URL-safe Base64
        assertThat(saved.getTokenHash()).isEqualTo(AccountSessionService.hash(token)).isNotEqualTo(token);
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    void 만료된_토큰은_거절하고_지운다() {
        SessionToken expired = new SessionToken(AccountSessionService.hash("old"), 5L,
                LocalDateTime.now().minusDays(31), LocalDateTime.now().minusDays(1));
        given(repository.findById(AccountSessionService.hash("old"))).willReturn(Optional.of(expired));

        assertThat(sessionService.resolveAccountId("old")).isEmpty();
        verify(repository).delete(expired);
    }

    @Test
    void 유효한_토큰이면_계정_id() {
        SessionToken valid = new SessionToken(AccountSessionService.hash("tok"), 5L,
                LocalDateTime.now(), LocalDateTime.now().plusDays(30));
        given(repository.findById(AccountSessionService.hash("tok"))).willReturn(Optional.of(valid));

        assertThat(sessionService.resolveAccountId("tok")).contains(5L);
        assertThat(sessionService.resolveAccountId(null)).isEmpty();
    }
}
