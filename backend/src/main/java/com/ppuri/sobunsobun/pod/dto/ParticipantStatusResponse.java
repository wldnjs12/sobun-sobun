package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.PodParticipant;

/** 대표가 정산 결과 화면에서 보는 참여자별 송금/수령 현황 1건. */
public record ParticipantStatusResponse(Long userId, Boolean paid, Boolean pickedUp) {

    public static ParticipantStatusResponse from(PodParticipant p) {
        return new ParticipantStatusResponse(p.getUserId(), p.getPaidAt() != null, p.getPickedUpAt() != null);
    }
}
