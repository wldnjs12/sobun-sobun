package com.ppuri.sobunsobun.auth.service;

import lombok.Getter;

/** GPS 2차 확인 실패(반경 밖, 등록된 건물 없음 등). message는 프론트 화면에 그대로 보여줄 문구다. */
@Getter
public class LocationCheckException extends RuntimeException {

    private final String code;

    public LocationCheckException(String code, String message) {
        super(message);
        this.code = code;
    }
}
