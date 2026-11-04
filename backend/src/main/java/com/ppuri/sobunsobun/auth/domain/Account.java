package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 로그인 계정 (아이디 + 비밀번호).
 *
 * 왜 User와 따로 두나: User(users 테이블)는 "어느 건물 소속인가"만 담고, 건물 등록 때 생긴다.
 * 계정은 가입 즉시 생기고 건물은 나중에 등록하므로 둘의 생성 시점이 다르다.
 * 대신 Account.id == User.id 로 같은 사람을 가리킨다 (필터가 X-User-Id를 Account.id로 채워줌).
 */
@Entity
@Table(name = "accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String loginId;

    /** 비밀번호 원문은 저장하지 않는다. BCrypt 해시만 저장 → DB가 털려도 원래 비밀번호를 바로 알 수 없다. */
    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 10)
    private String nickname;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public Account(String loginId, String passwordHash, String nickname) {
        this.loginId = loginId;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.createdAt = LocalDateTime.now();
    }
}
