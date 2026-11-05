package com.ppuri.sobunsobun.pod.domain;

/** 대표만 할 수 있는 일(수정·취소·마감·참여자 현황)을 다른 사람이 시도할 때 던진다 → 403 + code "POD_FORBIDDEN". */
public class PodForbiddenException extends RuntimeException {

    public PodForbiddenException(String message) {
        super(message);
    }
}
