package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Account;
import com.ppuri.sobunsobun.auth.domain.AccountRepository;
import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.AccountAuthResponse;
import com.ppuri.sobunsobun.auth.dto.LoginRequest;
import com.ppuri.sobunsobun.auth.dto.MeResponse;
import com.ppuri.sobunsobun.auth.dto.SignupRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 회원가입·로그인·로그아웃·내 정보 (2026-11 기획 개편: 계정 신규). */
@Service
@RequiredArgsConstructor
public class AccountService {

    // static으로 하나만 만든다: BCryptPasswordEncoder는 상태가 없어서 공유해도 안전하다
    private static final PasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    // 로그인 시 아이디가 없을 때도 BCrypt 비교를 한 번 해서, 응답 시간 차이로 "가입된 아이디인지" 알아내지 못하게 한다
    private static final String DUMMY_HASH = PASSWORD_ENCODER.encode("dummy-password-for-timing");
    // "인천광역시 미추홀구 인하로67번길 3 (용현동)" → "인하로67번길 3"
    private static final Pattern ROAD_AND_NUMBER = Pattern.compile("(\\S+(?:로|길))\\s*(\\d+(?:-\\d+)?)");

    private final AccountRepository accountRepository;
    private final AccountSessionService sessionService;
    private final UserRepository userRepository;
    private final BuildingRepository buildingRepository;

    /** 가입하면 바로 로그인 상태가 되도록 토큰까지 발급한다 (가입 후 로그인 화면을 한 번 더 거치지 않게). */
    @Transactional
    public AccountAuthResponse signup(SignupRequest request) {
        String loginId = request.loginId().trim();
        if (accountRepository.existsByLoginId(loginId)) {
            throw AccountException.duplicateLoginId();
        }
        Account account;
        try {
            account = accountRepository.saveAndFlush(
                    new Account(loginId, PASSWORD_ENCODER.encode(request.password()), request.nickname().trim()));
        } catch (DataIntegrityViolationException e) {
            // 거의 동시에 같은 아이디로 두 번 가입하면 exists 검사는 둘 다 통과하고 DB unique 제약에서 걸린다
            throw AccountException.duplicateLoginId();
        }
        return new AccountAuthResponse(sessionService.issue(account.getId()), account.getId(), account.getNickname());
    }

    @Transactional
    public AccountAuthResponse login(LoginRequest request) {
        Account account = accountRepository.findByLoginId(request.loginId().trim()).orElse(null);
        String hash = account == null ? DUMMY_HASH : account.getPasswordHash();
        boolean matches = PASSWORD_ENCODER.matches(request.password(), hash);
        if (account == null || !matches) {
            throw AccountException.invalidCredentials();
        }
        return new AccountAuthResponse(sessionService.issue(account.getId()), account.getId(), account.getNickname());
    }

    public void logout(String token) {
        sessionService.revoke(token);
    }

    @Transactional(readOnly = true)
    public MeResponse me(Long accountId) {
        Account account = accountRepository.findById(accountId).orElseThrow(AccountException::unauthorized);
        MeResponse.MyBuilding building = userRepository.findById(accountId)
                .flatMap(user -> buildingRepository.findById(user.getBuildingId()))
                .map(AccountService::toMyBuilding)
                .orElse(null);
        return new MeResponse(account.getId(), account.getLoginId(), account.getNickname(), building);
    }

    private static MeResponse.MyBuilding toMyBuilding(Building b) {
        return new MeResponse.MyBuilding(
                b.getId(),
                displayName(b.getName(), b.getRoadAddress()),
                b.getRoadAddress(),
                b.getDong(),
                null, // TODO(integration): user.getDetailAddress() — 주소 담당이 User에 상세주소를 추가하면 연결
                NeighborhoodService.neighborhoodName(b.getRoadAddress()));
    }

    /** 건물명이 없는 주택·빌라는 "도로명 + 건물번호"를 이름처럼 보여준다. */
    static String displayName(String buildingName, String roadAddress) {
        if (StringUtils.hasText(buildingName)) return buildingName;
        if (roadAddress == null) return null;
        String withoutParen = roadAddress.replaceAll("\\s*\\(.*\\)\\s*$", "");
        Matcher m = ROAD_AND_NUMBER.matcher(withoutParen);
        String found = null;
        while (m.find()) found = m.group(1) + " " + m.group(2);
        return found != null ? found : withoutParen;
    }
}
