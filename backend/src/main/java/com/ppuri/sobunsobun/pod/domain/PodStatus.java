package com.ppuri.sobunsobun.pod.domain;

/** 팟 진행 상태. OPEN(모집중) → CLOSED(대표가 마감, 정산 진행) 또는 CANCELLED(대표가 모집 취소). */
public enum PodStatus {
    OPEN,
    CLOSED,
    CANCELLED
}
