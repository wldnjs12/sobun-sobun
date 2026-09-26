package com.ppuri.sobunsobun.global.common;

import lombok.Getter;

/**
 * 모든 API 응답을 감싸는 공통 포맷.
 * 프론트에서 항상 { success, data, message } 형태로 받게 하여
 * 초보 팀원도 API 연동 규칙을 하나만 외우면 되게 한다.
 */
@Getter
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String message;

    private ApiResponse(boolean success, T data, String message) {
        this.success = success;
        this.data = data;
        this.message = message;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
