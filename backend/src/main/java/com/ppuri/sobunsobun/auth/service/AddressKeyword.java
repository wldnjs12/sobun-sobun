package com.ppuri.sobunsobun.auth.service;

import java.util.regex.Pattern;

/**
 * 주소 검색어 정리. Juso는 특수문자(%, =, <, > 등)나 SQL 예약어(SELECT, OR …)가 섞이면
 * 결과 대신 에러(E0013)를 돌려주고, 1글자면 E0008을 돌려준다.
 * 그래서 Juso에 보내기 전에 우리가 먼저 걸러서 "왜 안 되는지"를 친절한 문구로 알려준다.
 * (Juso 공식 개발자 가이드의 checkSearchedWord 예제와 같은 규칙)
 */
public final class AddressKeyword {

    public static final int MIN_LENGTH = 2;
    /** Juso 제한: 한글 기준 40자. 그보다 길면 E0010. */
    public static final int MAX_LENGTH = 40;

    // 주소에 쓰이는 글자(한글·영문·숫자·공백·하이픈)만 남긴다. 복사해 붙인 "(용현동)" 괄호도 공백으로 바뀐다
    private static final Pattern NOT_ALLOWED = Pattern.compile("[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ\\s\\-]");
    private static final Pattern SQL_WORDS = Pattern.compile(
            "(?i)\\b(or|and|select|insert|delete|update|create|drop|exec|union|fetch|declare|truncate)\\b");
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern HAS_LETTER = Pattern.compile("[A-Za-z가-힣]");

    private AddressKeyword() {
    }

    /** 정리된 검색어를 돌려준다. 검색할 수 없는 입력이면 400(INVALID_KEYWORD). */
    public static String sanitize(String raw) {
        String cleaned = raw == null ? "" : raw;
        cleaned = NOT_ALLOWED.matcher(cleaned).replaceAll(" ");
        cleaned = SQL_WORDS.matcher(cleaned).replaceAll(" ");
        cleaned = SPACES.matcher(cleaned).replaceAll(" ").trim();

        if (cleaned.length() < MIN_LENGTH) {
            throw AddressException.invalidKeyword("검색어를 두 글자 이상 입력해주세요");
        }
        if (!HAS_LETTER.matcher(cleaned).find()) {
            // "123"처럼 숫자만 있으면 Juso가 E0009로 거절한다
            throw AddressException.invalidKeyword("검색어를 조금 더 자세히 입력해주세요 (예: 인하로67번길, 용현동 123)");
        }
        if (cleaned.length() > MAX_LENGTH) {
            cleaned = cleaned.substring(0, MAX_LENGTH).trim();
        }
        return cleaned;
    }
}
