package com.ppuri.sobunsobun.settlement.service;

/**
 * OCR 키 없이 로컬 개발할 때 쓰는 가짜 구현체. 어떤 이미지를 넣어도 정해 둔 텍스트를 돌려준다.
 * text가 null이면 OCR 호출 실패를 흉내 내어 예외를 던진다 (실패 fallback 테스트용).
 */
public class StubReceiptOcrClient implements ReceiptOcrClient {

    static final String SAMPLE_RECEIPT = """
            소분마트 영수증
            대용량 양파 5kg 1 8,900
            대파 한단 1 3,400
            합계 12,300
            카드결제 12,300
            """;

    private final String text;

    public StubReceiptOcrClient() {
        this(SAMPLE_RECEIPT);
    }

    public StubReceiptOcrClient(String text) {
        this.text = text;
    }

    @Override
    public String recognizeText(byte[] image, String format) {
        if (text == null) {
            throw new IllegalStateException("Stub OCR 실패");
        }
        return text;
    }
}
