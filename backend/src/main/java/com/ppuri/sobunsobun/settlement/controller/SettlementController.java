package com.ppuri.sobunsobun.settlement.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.settlement.domain.SettlementException;
import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import com.ppuri.sobunsobun.settlement.dto.SettlementConfirmRequest;
import com.ppuri.sobunsobun.settlement.dto.SettlementResponse;
import com.ppuri.sobunsobun.settlement.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    /**
     * 대표가 확인한 금액으로 정산 확정. userId는 요청자(로그인이 없어 임시로 쿼리로 받는다, 팟 API와 같은 방식).
     * 다른 건물 사용자면 403(BUILDING_ACCESS_DENIED, 전역 핸들러가 처리), 대표가 아니면 403, 없는 팟이면 404.
     */
    @PostMapping("/{podId}/confirm")
    public ApiResponse<SettlementResponse> confirm(@PathVariable Long podId,
                                                   @RequestParam Long userId,
                                                   @RequestBody SettlementConfirmRequest request) {
        return ApiResponse.ok(settlementService.confirm(podId, userId, request));
    }

    /**
     * 확정된 정산 결과 조회 (참여자 화면·다른 기기용). 다른 건물 사용자면 403.
     * 확정 전이거나 없는 팟이면 에러가 아니라 200 + data=null — 공용 client.js가 success=false면 예외를 던지기 때문에,
     * "아직 정산 전"을 정상 응답으로 내려줘야 화면이 대기 상태를 바로 그릴 수 있다.
     */
    @GetMapping("/{podId}")
    public ApiResponse<SettlementResponse> getConfirmed(@PathVariable Long podId, @RequestParam Long userId) {
        return ApiResponse.ok(settlementService.findConfirmed(podId, userId));
    }

    /** 잘못된 파일/입력, 확정할 수 없는 팟 → 400, 없는 팟 → 404, 대표가 아님 → 403. 응답은 { success: false, message } */
    @ExceptionHandler(SettlementException.class)
    public ResponseEntity<ApiResponse<Void>> handleSettlementFailure(SettlementException e) {
        return ResponseEntity.status(e.getStatus()).body(ApiResponse.fail(e.getMessage()));
    }

    /** multipart에 receipt 파트가 아예 없을 때 */
    @ExceptionHandler(MissingServletRequestPartException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMissingReceipt(MissingServletRequestPartException e) {
        return ApiResponse.fail("영수증 사진을 선택해주세요.");
    }
}
