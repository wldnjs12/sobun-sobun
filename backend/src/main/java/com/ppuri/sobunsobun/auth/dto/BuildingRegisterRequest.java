package com.ppuri.sobunsobun.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 건물 확정 등록 요청.
 * - buildingName: 선택. 주택·빌라는 Juso 건물명이 빈 문자열이라 필수로 두면 등록 자체가 400으로 막혔다.
 *   비어 있으면 서버가 displayName → 도로명+건물번호 순으로 이름을 채운다.
 * - dong: 아파트일 때만 값이 있다 (빌라/원룸은 null). 같은 건물 판정(buildingKey)에 쓰인다.
 * - detailAddress: 선택. 호수·층 등 상세주소(예: "302호"). 본인만 보는 값이라 건물(Building)이 아니라 사용자(User)에 저장하고,
 *   다른 사용자 응답에는 절대 넣지 않는다.
 * - jibunAddress: 선택. 도로명주소로 좌표를 못 찾을 때 지오코딩 재시도용.
 */
public record BuildingRegisterRequest(
        @NotBlank(message = "도로명주소가 필요해요") String roadAddress,
        @NotBlank(message = "건물관리번호가 필요해요") String bdMgtSn,
        @Size(max = 100, message = "건물명이 너무 길어요") String buildingName,
        @Size(max = 100, message = "건물 이름이 너무 길어요") String displayName,
        @Size(max = 200, message = "지번 주소가 너무 길어요") String jibunAddress,
        @Size(max = 20, message = "동 이름이 너무 길어요") String dong,
        @Size(max = 50, message = "상세주소는 50자 이내로 입력해주세요") String detailAddress
) {

    /** 예전 형식(4개 필드) 호환용 — 기존 테스트·호출부가 그대로 컴파일되게. */
    public BuildingRegisterRequest(String roadAddress, String bdMgtSn, String buildingName, String dong) {
        this(roadAddress, bdMgtSn, buildingName, null, null, dong, null);
    }
}
