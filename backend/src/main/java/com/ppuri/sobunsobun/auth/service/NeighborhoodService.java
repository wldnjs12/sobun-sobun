package com.ppuri.sobunsobun.auth.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 도로명주소에서 법정동 이름(예: "용현동")을 뽑는 작은 도우미.
 * 본인에게 "내 건물이 어느 동네인지" 보여줄 때만 쓴다 — 접근 범위는 건물 단위(BuildingAccessService)다.
 * (2026-11 한때 반경 1km 동네 범위를 검토했다가 보완계획서의 "건물 단위 격리"로 되돌리면서 반경 기능은 삭제함)
 */
public final class NeighborhoodService {

    private static final Pattern LEGAL_DONG = Pattern.compile("\\(([^,()]+?[동가리])(?:,[^)]*)?\\)");

    private NeighborhoodService() {
    }

    /** "인천광역시 미추홀구 인하로 100 (용현동)" → "용현동". 없으면 null. */
    public static String neighborhoodName(String roadAddress) {
        if (roadAddress == null) return null;
        Matcher m = LEGAL_DONG.matcher(roadAddress);
        String found = null;
        while (m.find()) found = m.group(1).trim();
        return found;
    }
}
