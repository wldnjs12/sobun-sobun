package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterRequest;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterResponse;
import com.ppuri.sobunsobun.auth.dto.LocationCheckRequest;
import com.ppuri.sobunsobun.auth.service.AddressException;
import com.ppuri.sobunsobun.auth.service.AddressKeyword;
import com.ppuri.sobunsobun.auth.service.AddressSearchClient;
import com.ppuri.sobunsobun.auth.service.BuildingRegisterService;
import com.ppuri.sobunsobun.auth.service.LocationCheckService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

/** 핵심 기능 ①: 주소+GPS 건물 인증 온보딩 (지원 담당) */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AddressSearchClient addressSearchClient;
    private final BuildingRegisterService buildingRegisterService;
    private final LocationCheckService locationCheckService;

    /** 한 번에 너무 뒤 페이지를 요청하지 못하게 막는다 (Juso도 결과 범위를 넘으면 E0015로 거절). */
    private static final int MAX_PAGE = 50;

    /**
     * 주소 후보 검색. 응답: { items: AddressCandidate[], totalCount, page, hasMore }
     * keyword는 Juso에 보내기 전에 정리한다(특수문자 제거·공백 정리·2글자 이상) — AddressKeyword 참고.
     */
    @GetMapping("/addresses/search")
    public ApiResponse<AddressSearchPage> searchAddresses(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "1") int page) {
        String cleaned = AddressKeyword.sanitize(keyword);
        int safePage = Math.max(1, Math.min(page, MAX_PAGE));
        return ApiResponse.ok(addressSearchClient.search(cleaned, safePage));
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

    /**
     * 주소 검색·건물 등록 실패 → 상태 코드는 예외가 정한다 (검색어 문제 400, 주소/지오코딩 API 문제 502·503).
     * 반경 밖 등 GPS 실패(LocationCheckException)는 GlobalExceptionHandler가 400 + code로 처리한다.
     */
    @ExceptionHandler(AddressException.class)
    public ResponseEntity<ApiResponse<Void>> handleAddress(AddressException e) {
        return ResponseEntity.status(e.getStatus()).body(ApiResponse.fail(e.getCode(), e.getMessage()));
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
