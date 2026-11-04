package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.dto.MyParticipationResponse;
import com.ppuri.sobunsobun.pod.dto.ParticipantStatusResponse;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.dto.PodUpdateRequest;
import com.ppuri.sobunsobun.pod.service.PodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 핵심 기능 ②: 팟 개설·참여·수정·취소·실시간 정산 갱신.
 *
 * "누가 요청했나"는 전부 X-User-Id 헤더로 받는다. 로그인 필터가 토큰을 확인한 뒤 이 헤더를 토큰의 userId로
 * 덮어쓰기 때문에, 클라이언트가 임의로 바꿔 보내도 남인 척할 수 없다. (예전처럼 ?userId= 쿼리로 받으면 위조 가능)
 */
@RestController
@RequestMapping("/api/pods")
@RequiredArgsConstructor
public class PodController {

    private static final String USER_ID = "X-User-Id";

    private final PodService podService;

    @PostMapping
    public ApiResponse<PodResponse> create(@RequestHeader(USER_ID) Long userId,
                                           @Valid @RequestBody PodCreateRequest request) {
        return ApiResponse.ok(podService.create(request, userId));
    }

    /**
     * 동네 홈 목록. buildingId는 예전 프론트 호환용으로 받기만 하고 쓰지 않는다 (범위는 요청자의 동네로 서버가 정함).
     * 예: /api/pods?keyword=휴지&category=TISSUE&status=OPEN&sort=DEADLINE
     */
    @GetMapping
    public ApiResponse<List<PodResponse>> list(@RequestHeader(USER_ID) Long userId,
                                               @RequestParam(required = false) Long buildingId,
                                               @RequestParam(required = false) String keyword,
                                               @RequestParam(required = false) String category,
                                               @RequestParam(required = false) String status,
                                               @RequestParam(required = false) String sort) {
        return ApiResponse.ok(podService.list(userId, keyword, category, status, sort));
    }

    /** 마이페이지: role=host(내가 연 팟, 기본) | joined(내가 참여한 팟) */
    @GetMapping("/mine")
    public ApiResponse<List<PodResponse>> listMine(@RequestHeader(USER_ID) Long userId,
                                                   @RequestParam(required = false) String role) {
        return ApiResponse.ok(podService.listMine(userId, role));
    }

    @GetMapping("/{podId}")
    public ApiResponse<PodResponse> getDetail(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.getDetail(podId, userId));
    }

    /** 대표의 글 수정. 모집중 + 대표 외 참여자가 없을 때만. 보낸 값만 바뀐다. */
    @PatchMapping("/{podId}")
    public ApiResponse<PodResponse> update(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId,
                                           @Valid @RequestBody PodUpdateRequest request) {
        return ApiResponse.ok(podService.update(podId, userId, request));
    }

    /** 대표의 모집 취소 (마감 전까지). */
    @PostMapping("/{podId}/cancel")
    public ApiResponse<PodResponse> cancel(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.cancel(podId, userId));
    }

    @PostMapping("/{podId}/join")
    public ApiResponse<PodResponse> join(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.join(podId, userId));
    }

    @DeleteMapping("/{podId}/join")
    public ApiResponse<PodResponse> cancelJoin(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.cancelJoin(podId, userId));
    }

    @PostMapping("/{podId}/close")
    public ApiResponse<PodResponse> close(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.close(podId, userId));
    }

    /** 정산 결과·비대면 픽업 화면용 — 내 참여/송금/수령 상태와 픽업 PIN. */
    @GetMapping("/{podId}/me")
    public ApiResponse<MyParticipationResponse> getMyParticipation(@PathVariable Long podId,
                                                                   @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.getMyParticipation(podId, userId));
    }

    /** 정산 결과 화면(대표용) — 참여자별 송금/수령 현황. */
    @GetMapping("/{podId}/participants")
    public ApiResponse<List<ParticipantStatusResponse>> listParticipants(@PathVariable Long podId,
                                                                          @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.listParticipants(podId, userId));
    }

    /** "보냈어요" 자가 신고 (실제 결제 연동 없음). */
    @PostMapping("/{podId}/paid")
    public ApiResponse<MyParticipationResponse> markPaid(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.markPaid(podId, userId));
    }

    /** "수령 완료" 자가 신고. */
    @PostMapping("/{podId}/picked-up")
    public ApiResponse<MyParticipationResponse> markPickedUp(@PathVariable Long podId,
                                                             @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podService.markPickedUp(podId, userId));
    }
}
