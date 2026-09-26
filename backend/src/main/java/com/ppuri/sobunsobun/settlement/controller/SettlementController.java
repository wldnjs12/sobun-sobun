package com.ppuri.sobunsobun.settlement.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import com.ppuri.sobunsobun.settlement.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    /** 핵심 기능 ③: 대표 수고비(정률) 반영 자동 정산식 */
    @PostMapping("/receipts")
    public ApiResponse<ReceiptOcrResult> uploadReceipt(@RequestParam MultipartFile receipt) throws Exception {
        return ApiResponse.ok(settlementService.recognizeReceipt(receipt.getBytes()));
    }
}
