package com.ppuri.sobunsobun.auth.controller;

import com.ppuri.sobunsobun.auth.dto.QrVerifyRequest;
import com.ppuri.sobunsobun.auth.service.BuildingAuthService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class BuildingAuthController {

    private final BuildingAuthService buildingAuthService;

    /** 핵심 기능 ①: QR+GPS 건물 인증 온보딩 */
    @PostMapping("/verify")
    public ApiResponse<Boolean> verify(@RequestBody QrVerifyRequest request) {
        return ApiResponse.ok(buildingAuthService.verify(request));
    }
}
