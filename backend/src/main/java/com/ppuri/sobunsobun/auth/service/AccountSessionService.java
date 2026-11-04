package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.SessionToken;
import com.ppuri.sobunsobun.auth.domain.SessionTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * 세션 토큰 발급·확인·삭제.
 *
 * JWT 대신 "DB에 저장하는 무작위 토큰"을 쓰는 이유: 로그아웃하면 DB에서 지우는 것만으로 즉시 무효가 되고,
 * 서명 키 관리가 필요 없어서 초보 팀원도 흐름을 따라가기 쉽다. (요청마다 DB 조회 1번은 해커톤 규모에선 문제없음)
 */
@Service
@RequiredArgsConstructor
public class AccountSessionService {

    public static final Duration SESSION_TTL = Duration.ofDays(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SessionTokenRepository sessionTokenRepository;

    /** 새 토큰을 만들어 저장하고 "원문"을 돌려준다. 원문은 이때 한 번만 알 수 있다 (DB엔 해시만). */
    @Transactional
    public String issue(Long accountId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        // URL-safe Base64: 헤더·URL 어디에 넣어도 깨지는 문자(+, /, =)가 없다
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime now = LocalDateTime.now();
        sessionTokenRepository.save(new SessionToken(hash(token), accountId, now, now.plus(SESSION_TTL)));
        return token;
    }

    /** 유효한 토큰이면 계정 id. 없거나 만료면 empty (만료된 건 이참에 지운다). */
    @Transactional
    public Optional<Long> resolveAccountId(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        Optional<SessionToken> found = sessionTokenRepository.findById(hash(token));
        if (found.isEmpty()) return Optional.empty();
        SessionToken session = found.get();
        if (session.isExpired(LocalDateTime.now())) {
            sessionTokenRepository.delete(session);
            return Optional.empty();
        }
        return Optional.of(session.getAccountId());
    }

    @Transactional
    public void revoke(String token) {
        if (token == null || token.isBlank()) return;
        sessionTokenRepository.deleteById(hash(token));
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 쓸 수 없는 JVM이에요", e); // 표준 JVM엔 항상 있음
        }
    }
}
