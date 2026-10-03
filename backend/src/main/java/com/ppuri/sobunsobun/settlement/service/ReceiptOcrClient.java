package com.ppuri.sobunsobun.settlement.service;

/**
 * 영수증 이미지 → OCR 텍스트. 실제 Naver 구현체와 키 없이 쓰는 Stub 구현체가 있다 (ReceiptOcrConfig에서 선택).
 * 호출 실패(네트워크, 타임아웃, 인식 실패 응답)는 예외로 던지고, success=false 변환은 SettlementService가 맡는다.
 */
public interface ReceiptOcrClient {

    /**
     * @param image  영수증 이미지 원본 바이트
     * @param format 이미지 형식 ("jpg" 또는 "png")
     * @return 영수증에서 읽은 전체 텍스트 (줄바꿈 포함)
     */
    String recognizeText(byte[] image, String format);
}
