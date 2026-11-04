package com.ppuri.sobunsobun.auth.dto;

/**
 * GET /api/account/me 응답. 본인에게만 내려가므로 본인 주소(도로명·동·상세주소)를 담아도 된다.
 * building은 건물 등록 전이면 null.
 */
public record MeResponse(Long userId, String loginId, String nickname, MyBuilding building) {

    public record MyBuilding(
            Long buildingId,
            String buildingName,
            String roadAddress,
            String dong,
            String detailAddress,
            String neighborhoodName
    ) {
    }
}
