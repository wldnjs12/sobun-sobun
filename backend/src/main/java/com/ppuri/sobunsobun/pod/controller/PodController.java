package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.service.PodService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/pods")
@RequiredArgsConstructor
public class PodController {

    private final PodService podService;

    /** 핵심 기능 ②: 팟 개설·참여·실시간 정산 갱신 (지원 담당, 팀 리드 파트) */
    @PostMapping("/{podId}/recalculate")
    public ApiResponse<Void> recalculate(@PathVariable Long podId,
                                          @RequestParam BigDecimal totalAmount,
                                          @RequestParam BigDecimal commissionRate,
                                          @RequestParam int participantCount) {
        podService.recalcAndBroadcast(podId, totalAmount, commissionRate, participantCount);
        return ApiResponse.ok(null);
    }
}
