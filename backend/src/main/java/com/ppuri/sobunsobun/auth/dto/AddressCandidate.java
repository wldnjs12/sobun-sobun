package com.ppuri.sobunsobun.auth.dto;

import java.util.List;

/**
 * 주소 검색 결과 후보 하나.
 * isApartment=false면 dongOptions는 빈 리스트 — 프론트는 그 경우 직접입력 폼으로 폴백한다.
 */
public record AddressCandidate(
        String roadAddress,
        String buildingName,
        String bdMgtSn,
        boolean isApartment,
        List<String> dongOptions
) {
}
