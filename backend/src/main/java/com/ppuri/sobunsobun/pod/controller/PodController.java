package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.dto.MyParticipationResponse;
import com.ppuri.sobunsobun.pod.dto.ParticipantStatusResponse;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.service.PodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    /** 건물 홈 화면(S4)용 — 진행중인 팟 목록. */
    @GetMapping
    public ApiResponse<List<PodResponse>> list(@RequestParam Long buildingId) {
        return ApiResponse.ok(podService.list(buildingId));
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

    /** 정산 결과·비대면 픽업 화면용 — 내 참여/송금/수령 상태와 픽업 PIN. */
    @GetMapping("/{podId}/me")
    public ApiResponse<MyParticipationResponse> getMyParticipation(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(podService.getMyParticipation(podId, userId));
    }

    /** 정산 결과 화면(대표용) — 참여자별 송금/수령 현황. */
    @GetMapping("/{podId}/participants")
    public ApiResponse<List<ParticipantStatusResponse>> listParticipants(@PathVariable Long podId,
                                                                          @RequestParam Long hostUserId) {
        return ApiResponse.ok(podService.listParticipants(podId, hostUserId));
    }

    /** "보냈어요" 자가 신고 (실제 결제 연동 없음). */
    @PostMapping("/{podId}/paid")
    public ApiResponse<MyParticipationResponse> markPaid(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(podService.markPaid(podId, userId));
    }

    /** "수령 완료" 자가 신고. */
    @PostMapping("/{podId}/picked-up")
    public ApiResponse<MyParticipationResponse> markPickedUp(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(podService.markPickedUp(podId, userId));
    }
}
