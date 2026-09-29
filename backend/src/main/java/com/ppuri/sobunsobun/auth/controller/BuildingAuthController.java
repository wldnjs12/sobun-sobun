package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.domain.BuildingAuthException;
import com.ppuri.sobunsobun.auth.dto.QrVerifyRequest;
import com.ppuri.sobunsobun.auth.service.BuildingAuthService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class BuildingAuthController {

    private final BuildingAuthService buildingAuthService;

    /**
     * 핵심 기능 ①: QR+GPS 건물 인증 온보딩
     *
     * TODO: 로그인 도입 전 임시 사용자 식별. 로그인이 붙으면 X-User-Id 헤더 대신 인증 정보에서 userId를 꺼내도록 교체.
     *       헤더가 없으면 인증 판정만 하고 BUILDING_AUTH 기록은 남기지 않는다.
     */
    @PostMapping("/verify")
    public ApiResponse<Boolean> verify(@Valid @RequestBody QrVerifyRequest request,
                                       @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return ApiResponse.ok(buildingAuthService.verify(request, userId));
    }

    /** QR 무효·만료·반경 밖 → 400 + { success: false, message, code } */
    @ExceptionHandler(BuildingAuthException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleAuthFailure(BuildingAuthException e) {
        return ApiResponse.fail(e.getErrorCode().name(), e.getMessage());
    }

    /** @Valid 검증 실패(토큰 누락, 좌표 범위 초과 등) → 첫 번째 에러 문구만 내려준다 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidRequest(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않아요");
        return ApiResponse.fail(message);
    }
}
