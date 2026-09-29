package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.service.PodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** 핵심 기능 ②: 팟 개설·참여·실시간 정산 갱신 (지원 담당, 팀 리드 파트) */
@RestController
@RequestMapping("/api/pods")
@RequiredArgsConstructor
public class PodController {

    private final PodService podService;

    @PostMapping
    public ApiResponse<PodResponse> create(@Valid @RequestBody PodCreateRequest request) {
        return ApiResponse.ok(podService.create(request));
    }

    @GetMapping("/{podId}")
    public ApiResponse<PodResponse> getDetail(@PathVariable Long podId) {
        return ApiResponse.ok(podService.getDetail(podId));
    }

    // TODO(①온보딩 연동 전 임시): 실제 로그인 세션이 생기면 userId는 세션에서 꺼내도록 교체
    @PostMapping("/{podId}/join")
    public ApiResponse<PodResponse> join(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(podService.join(podId, userId));
    }

    @DeleteMapping("/{podId}/join")
    public ApiResponse<PodResponse> cancelJoin(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(podService.cancelJoin(podId, userId));
    }

    @PostMapping("/{podId}/close")
    public ApiResponse<PodResponse> close(@PathVariable Long podId, @RequestParam Long hostUserId) {
        return ApiResponse.ok(podService.close(podId, hostUserId));
    }
}
