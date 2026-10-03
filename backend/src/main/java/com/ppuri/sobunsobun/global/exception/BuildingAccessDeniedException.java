package com.ppuri.sobunsobun.global.exception;

/**
 * 요청자가 리소스(팟·정산·커뮤니티 글 등)의 건물 소속이 아닐 때 던진다. auth/pod/settlement/community가 공통으로 던지므로
 * (어느 한 컨텍스트에 속하지 않는 교차 관심사라) global에 둔다. GlobalExceptionHandler가 403으로 매핑한다.
 */
public class BuildingAccessDeniedException extends RuntimeException {

    public BuildingAccessDeniedException(String message) {
        super(message);
    }
}
