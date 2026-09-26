package com.ppuri.sobunsobun.settlement.service;

import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class SettlementService {

    /**
     * TODO:
     * 1) 업로드된 영수증 이미지를 Naver Clova OCR API로 전송해 금액 인식
     * 2) 인식 실패 시 success=false 반환 -> 프론트에서 수동 입력 폼으로 전환(fallback)
     */
    public ReceiptOcrResult recognizeReceipt(byte[] imageBytes) {
        throw new UnsupportedOperationException("문소원 담당 - Clova OCR 연동 예정");
    }

    /** 정률 수고비를 반영한 최종 정산 금액 계산. 원가 초과 청구를 시스템적으로 차단한다. */
    public BigDecimal calculateFinalAmount(BigDecimal recognizedCost, BigDecimal commissionRate) {
        return recognizedCost.multiply(BigDecimal.ONE.add(commissionRate));
    }
}
