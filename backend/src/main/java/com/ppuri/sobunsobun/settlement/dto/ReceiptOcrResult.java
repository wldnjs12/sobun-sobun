package com.ppuri.sobunsobun.settlement.dto;

import java.math.BigDecimal;

/** Naver Clova OCR 응답을 우리 도메인에 맞게 정리한 결과. */
public record ReceiptOcrResult(BigDecimal recognizedAmount, boolean success) {
}
