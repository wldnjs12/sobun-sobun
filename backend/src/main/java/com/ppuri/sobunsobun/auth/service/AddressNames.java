package com.ppuri.sobunsobun.auth.service;

import org.springframework.util.StringUtils;

/**
 * 화면에 보여줄 건물 "이름" 만들기.
 * 주택·빌라는 Juso 건물명(bdNm)이 빈 문자열이라 "건물 이름 없음"으로 보이고, 예전엔 등록조차 막혔다.
 * 사람들이 실제로 부르는 방식대로 "도로명 + 건물번호"(예: "인하로67번길 3")를 이름 대신 쓴다.
 */
public final class AddressNames {

    private AddressNames() {
    }

    /** Juso 응답 필드로 만든다: rn(도로명) + buldMnnm(본번) [+ "-" + buldSlno(부번, 0이면 생략)]. */
    public static String roadNumberName(String roadName, String mainNumber, String subNumber) {
        if (!StringUtils.hasText(roadName) || !StringUtils.hasText(mainNumber) || "0".equals(mainNumber.trim())) {
            return null;
        }
        String number = mainNumber.trim();
        if (StringUtils.hasText(subNumber) && !"0".equals(subNumber.trim())) {
            number += "-" + subNumber.trim();
        }
        return roadName.trim() + " " + number;
    }

    /**
     * 도로명주소 문자열에서 "도로명 + 건물번호"만 뽑는다.
     * "인천광역시 미추홀구 인하로 45-1 (용현동)" → "인하로 45-1". 형식이 다르면 괄호만 떼고 그대로 돌려준다.
     */
    public static String roadNumberName(String roadAddress) {
        if (!StringUtils.hasText(roadAddress)) return null;
        String withoutParen = stripParenthesis(roadAddress);
        String[] tokens = withoutParen.split("\\s+");
        if (tokens.length >= 2 && Character.isDigit(tokens[tokens.length - 1].charAt(0))) {
            return tokens[tokens.length - 2] + " " + tokens[tokens.length - 1];
        }
        return withoutParen;
    }

    /** 건물명이 있으면 건물명, 없으면 fallback(도로명+건물번호). */
    public static String displayName(String buildingName, String fallback) {
        return StringUtils.hasText(buildingName) ? buildingName.trim() : fallback;
    }

    /** "… 인하로 45 (용현동)" → "… 인하로 45". 카카오 지오코딩은 괄호가 없는 쪽이 더 잘 찾는다. */
    public static String stripParenthesis(String address) {
        if (address == null) return null;
        return address.replaceAll("\\s*\\([^)]*\\)\\s*$", "").trim();
    }
}
