package com.ppuri.sobunsobun.global.exception;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 도메인 규칙 위반을 ApiResponse.fail 형태로 통일해서 내려준다 (프론트가 항상 같은 형태로 에러를 받게). */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail(e.getMessage()));
    }

    /** 다른 건물 리소스에 접근하려는 요청 → 403 (기획 개편: 건물 소속 검증). */
    @ExceptionHandler(BuildingAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleBuildingAccessDenied(BuildingAccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.fail("BUILDING_ACCESS_DENIED", e.getMessage()));
    }
}
