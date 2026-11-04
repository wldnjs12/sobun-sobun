package com.ppuri.sobunsobun.auth.dto;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.service.NeighborhoodService;

/**
 * 건물 등록 결과. 등록한 "본인"에게만 내려가는 응답이라 detailAddress(호수 등)를 포함해도 된다.
 * ⚠️ 이 DTO를 다른 사용자에게 보이는 응답(팟·커뮤니티 등)에 재사용하지 말 것.
 */
public record BuildingRegisterResponse(
        Long buildingId,
        String name,
        String dong,
        String roadAddress,
        String neighborhoodName,
        String detailAddress
) {

    public static BuildingRegisterResponse of(Building building, String detailAddress) {
        return new BuildingRegisterResponse(
                building.getId(),
                building.getName(),
                building.getDong(),
                building.getRoadAddress(),
                NeighborhoodService.neighborhoodName(building.getRoadAddress()),
                detailAddress);
    }
}
