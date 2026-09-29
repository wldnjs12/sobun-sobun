package com.ppuri.sobunsobun.settlement.domain;

/** 정산 요청 거절(잘못된 파일/입력, 확정 불가 상태). message는 프론트 화면에 그대로 보여줄 문구다. */
public class SettlementException extends RuntimeException {

    public SettlementException(String message) {
        super(message);
    }
}
