package com.ppuri.sobunsobun.pod.domain;

/**
 * 입력값이 팟 규칙에 맞지 않을 때(예: 1인당 개수 × 목표 인원 > 총 개수) 던진다 → 400.
 * IllegalArgumentException을 쓰지 않는 이유: 전역 핸들러가 그걸 404(없는 리소스)로 바꾸기 때문.
 */
public class PodRuleViolationException extends RuntimeException {

    public PodRuleViolationException(String message) {
        super(message);
    }
}
