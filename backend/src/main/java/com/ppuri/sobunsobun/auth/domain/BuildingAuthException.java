package com.ppuri.sobunsobun.auth.domain;

import lombok.Getter;

/** 건물 인증 실패. message는 프론트 화면에 그대로 보여줄 문구다. */
@Getter
public class BuildingAuthException extends RuntimeException {

    private final BuildingAuthErrorCode errorCode;

    public BuildingAuthException(BuildingAuthErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
