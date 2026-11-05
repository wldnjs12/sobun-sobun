package com.ppuri.sobunsobun.auth.dto;

import java.util.List;

/**
 * 주소 검색 결과 후보 하나.
 * - buildingName: Juso의 건물명(bdNm). 주택·빌라는 빈 문자열("")인 경우가 많다 (실제 "인하로" 검색 20건 중 절반 이상).
 * - displayName: 화면에 크게 보여줄 이름. 건물명이 있으면 건물명, 없으면 "도로명 + 건물번호" (예: "인하로 45").
 * - jibunAddress: 지번 주소 (예: "인천광역시 미추홀구 용현동 165-6"). 동네 사람들은 지번으로 기억하는 경우가 많다.
 * - neighborhoodName: 법정동 이름 (예: "용현동").
 * isApartment=false면 dongOptions는 빈 리스트 — 프론트는 그 경우 직접입력 폼으로 폴백한다.
 */
public record AddressCandidate(
        String roadAddress,
        String jibunAddress,
        String buildingName,
        String displayName,
        String neighborhoodName,
        String bdMgtSn,
        boolean isApartment,
        List<String> dongOptions
) {
}
