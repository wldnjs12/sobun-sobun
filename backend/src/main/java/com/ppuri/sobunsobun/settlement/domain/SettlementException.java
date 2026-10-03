package com.ppuri.sobunsobun.settlement.domain;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 정산 요청 거절. message는 프론트 화면에 그대로 보여줄 문구다.
 * 대부분은 잘못된 입력·상태라 400이고, 없는 팟(404)·대표가 아님(403)만 상태를 따로 지정한다.
 */
@Getter
public class SettlementException extends RuntimeException {

    private final HttpStatus status;

    public SettlementException(String message) {
        this(HttpStatus.BAD_REQUEST, message);
    }

    public SettlementException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
