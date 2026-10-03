package com.ppuri.sobunsobun.auth.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 건물 인증 실패 사유. 프론트는 name()(= 응답의 code)으로 분기하고, message는 화면에 그대로 보여준다. */
@Getter
@RequiredArgsConstructor
public enum BuildingAuthErrorCode {

    INVALID_QR("유효하지 않은 QR이에요. 다시 스캔해주세요."),
    EXPIRED_QR("QR이 만료됐어요, 다시 스캔해주세요."),
    OUT_OF_RANGE("건물 근처에서 다시 시도해주세요.");

    private final String message;
}
