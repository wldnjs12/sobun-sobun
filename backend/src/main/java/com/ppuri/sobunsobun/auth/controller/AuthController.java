package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterRequest;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterResponse;
import com.ppuri.sobunsobun.auth.dto.LocationCheckRequest;
import com.ppuri.sobunsobun.auth.service.AddressSearchClient;
import com.ppuri.sobunsobun.auth.service.BuildingRegisterService;
import com.ppuri.sobunsobun.auth.service.LocationCheckException;
import com.ppuri.sobunsobun.auth.service.LocationCheckService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 핵심 기능 ①: 주소+GPS 건물 인증 온보딩 (지원 담당) */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AddressSearchClient addressSearchClient;
    private final BuildingRegisterService buildingRegisterService;
    private final LocationCheckService locationCheckService;

    @GetMapping("/addresses/search")
    public ApiResponse<List<AddressCandidate>> searchAddresses(@RequestParam String keyword) {
        return ApiResponse.ok(addressSearchClient.search(keyword));
    }

    @PostMapping("/buildings/register")
    public ApiResponse<BuildingRegisterResponse> registerBuilding(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody BuildingRegisterRequest request) {
        return ApiResponse.ok(buildingRegisterService.register(userId, request));
    }

    /** GPS 2차 확인. 캐시 없이 매번 재판정한다 — 행동(팟 개설·참여·커뮤니티 입장) 직전마다 호출. */
    @PostMapping("/location-check")
    public ApiResponse<Boolean> checkLocation(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody LocationCheckRequest request) {
        return ApiResponse.ok(locationCheckService.check(userId, request));
    }

    /** 반경 밖·등록된 건물 없음 등 → 400 + { success: false, message, code } */
    @ExceptionHandler(LocationCheckException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleLocationCheckFailure(LocationCheckException e) {
        return ApiResponse.fail(e.getCode(), e.getMessage());
    }

    /** @Valid 검증 실패 → 첫 번째 에러 문구만 내려준다 */
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
