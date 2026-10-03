package com.ppuri.sobunsobun.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** dong은 아파트일 때만 값이 있다 (빌라/원룸은 null). */
public record BuildingRegisterRequest(
        @NotBlank(message = "도로명주소가 필요해요") String roadAddress,
        @NotBlank(message = "건물관리번호가 필요해요") String bdMgtSn,
        @NotBlank(message = "건물명이 필요해요") String buildingName,
        String dong
) {
}
