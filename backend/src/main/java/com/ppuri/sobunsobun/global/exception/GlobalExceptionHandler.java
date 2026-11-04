package com.ppuri.sobunsobun.global.exception;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.ppuri.sobunsobun.auth.service.AccountException;
import com.ppuri.sobunsobun.auth.service.LocationCheckException;
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

    /**
     * GPS 2차 확인 실패(반경 밖·건물 미등록·위치 확인 없이 개설/참여 시도) → 400 + code.
     * 인증 API뿐 아니라 팟 API에서도 던지므로 전역에서 처리한다.
     */
    @ExceptionHandler(LocationCheckException.class)
    public ResponseEntity<ApiResponse<Void>> handleLocationCheck(LocationCheckException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getCode(), e.getMessage()));
    }

    /** 계정 실패(아이디 중복 409 · 로그인 실패 401 · 로그인 필요 401) → 상태 코드 + code 그대로. */
    @ExceptionHandler(AccountException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccount(AccountException e) {
        return ResponseEntity.status(e.getStatus()).body(ApiResponse.fail(e.getCode(), e.getMessage()));
    }
}
