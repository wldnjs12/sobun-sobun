package com.ppuri.sobunsobun.auth.dto;

import com.ppuri.sobunsobun.auth.domain.LocationCheckPurpose;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** 행동(팟 개설·참여·커뮤니티 입장) 직전마다 보내는 GPS 2차 확인 요청. */
public record LocationCheckRequest(
        @NotNull(message = "위치 정보가 필요해요")
        @DecimalMin(value = "-90.0", message = "위도 값이 올바르지 않아요")
        @DecimalMax(value = "90.0", message = "위도 값이 올바르지 않아요")
        Double latitude,

        @NotNull(message = "위치 정보가 필요해요")
        @DecimalMin(value = "-180.0", message = "경도 값이 올바르지 않아요")
        @DecimalMax(value = "180.0", message = "경도 값이 올바르지 않아요")
        Double longitude,

        @NotNull(message = "확인 목적이 필요해요")
        LocationCheckPurpose purpose
) {
}
