package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.QrVerifyRequest;
import org.springframework.stereotype.Service;

@Service
public class BuildingAuthService {

    private static final double ALLOWED_RADIUS_METERS = 50.0;

    /**
     * TODO:
     * 1) qrToken으로 건물/발급시각 조회, 만료 여부 확인
     * 2) 건물 좌표와 요청 좌표의 거리 계산(Haversine) 후 ALLOWED_RADIUS_METERS 이내인지 검증
     * 3) 통과 시 사용자-건물 인증 기록 저장, 세션/토큰 발급
     */
    public boolean verify(QrVerifyRequest request) {
        throw new UnsupportedOperationException("문소원 담당 - 구현 예정");
    }
}
