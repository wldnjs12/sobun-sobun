package com.ppuri.sobunsobun.settlement.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.settlement.domain.SettlementException;
import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import com.ppuri.sobunsobun.settlement.dto.SettlementConfirmRequest;
import com.ppuri.sobunsobun.settlement.dto.SettlementResponse;
import com.ppuri.sobunsobun.settlement.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    /**
     * 핵심 기능 ③: 대표 수고비(정률) 반영 자동 정산식
     * 인식 실패는 200 + data.success=false (프론트가 수동 입력 폼으로 전환), 파일 자체가 잘못되면 400.
     */
    @PostMapping("/receipts")
    public ApiResponse<ReceiptOcrResult> uploadReceipt(@RequestParam("receipt") MultipartFile receipt) {
        return ApiResponse.ok(settlementService.recognizeReceipt(receipt));
    }

    /** 대표가 확인한 금액으로 정산 확정 */
    @PostMapping("/{podId}/confirm")
    public ApiResponse<SettlementResponse> confirm(@PathVariable Long podId,
                                                   @RequestBody SettlementConfirmRequest request) {
        return ApiResponse.ok(settlementService.confirm(podId, request));
    }

    /** 정산 결과 화면(12번) 재조회용 — 지원이 추가(참여자/대표가 새로고침해도 결과를 다시 받을 수 있어야 해서). */
    @GetMapping("/{podId}")
    public ApiResponse<SettlementResponse> getByPodId(@PathVariable Long podId) {
        return ApiResponse.ok(settlementService.getByPodId(podId));
    }

    /** 잘못된 파일/입력, 확정할 수 없는 팟 → 400 + { success: false, message } */
    @ExceptionHandler(SettlementException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleSettlementFailure(SettlementException e) {
        return ApiResponse.fail(e.getMessage());
    }

    /** multipart에 receipt 파트가 아예 없을 때 */
    @ExceptionHandler(MissingServletRequestPartException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMissingReceipt(MissingServletRequestPartException e) {
        return ApiResponse.fail("영수증 사진을 선택해주세요.");
    }
}
