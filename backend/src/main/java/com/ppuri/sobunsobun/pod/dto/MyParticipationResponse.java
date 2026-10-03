package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;

/**
 * 내가 이 팟에 참여했는지·송금/수령 자가신고 상태. pickupPin은 참여자에게만 내려주기 위해
 * (비참여자에게 노출되면 락커 보안 의미가 없어짐) 일반 {@link PodResponse}에는 넣지 않고 여기에만 둔다.
 */
public record MyParticipationResponse(Boolean joined, Boolean paid, Boolean pickedUp, String pickupPin) {

    public static MyParticipationResponse notJoined() {
        return new MyParticipationResponse(false, false, false, null);
    }

    public static MyParticipationResponse from(Pod pod, PodParticipant participant) {
        return new MyParticipationResponse(true, participant.getPaidAt() != null, participant.getPickedUpAt() != null,
                pod.getPickupPin());
    }
}
