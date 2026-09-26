package com.ppuri.sobunsobun.auth.dto;

/**
 * 프론트에서 QR 스캔 후 보내는 요청.
 * qrToken: 건물 방에 붙은 동적 QR에서 읽은 토큰
 * latitude/longitude: 스캔 시점의 사용자 GPS 좌표 (반경 50m 검증용)
 */
public record QrVerifyRequest(String qrToken, Double latitude, Double longitude) {
}
