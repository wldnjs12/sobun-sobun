package com.ppuri.sobunsobun.auth.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 프론트에서 QR 스캔 후 보내는 요청.
 * qrToken: 건물 1층에 붙은 동적 QR에서 읽은 토큰
 * latitude/longitude: 스캔 시점의 사용자 GPS 좌표 (반경 50m 검증용)
 */
public record QrVerifyRequest(
        @NotBlank(message = "QR 토큰이 없어요, 다시 스캔해주세요")
        String qrToken,

        @NotNull(message = "위치 정보가 필요해요")
        @DecimalMin(value = "-90.0", message = "위도 값이 올바르지 않아요")
        @DecimalMax(value = "90.0", message = "위도 값이 올바르지 않아요")
        Double latitude,

        @NotNull(message = "위치 정보가 필요해요")
        @DecimalMin(value = "-180.0", message = "경도 값이 올바르지 않아요")
        @DecimalMax(value = "180.0", message = "경도 값이 올바르지 않아요")
        Double longitude
) {
}
