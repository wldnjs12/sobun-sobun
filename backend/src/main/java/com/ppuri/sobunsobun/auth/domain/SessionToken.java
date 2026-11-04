package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 로그인 세션 토큰. 로그인하면 하나 생기고, 로그아웃하면 지운다.
 *
 * 토큰 원문은 프론트(localStorage)에만 있고, DB에는 SHA-256 해시만 저장한다.
 * 왜: DB가 유출돼도 해시로는 다른 사람인 척 요청을 보낼 수 없다 (비밀번호를 해시로 저장하는 것과 같은 이유).
 * 토큰 자체가 32바이트 무작위 값이라 BCrypt처럼 느린 해시가 필요 없고, SHA-256이면 조회도 빠르다.
 */
@Entity
@Table(name = "session_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SessionToken {

    /** 토큰 원문의 SHA-256(hex). 그 자체로 유일해서 PK로 쓴다. */
    @Id
    @Column(length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Long accountId;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public SessionToken(String tokenHash, Long accountId, LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.accountId = accountId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
