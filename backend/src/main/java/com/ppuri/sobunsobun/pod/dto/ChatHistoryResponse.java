package com.ppuri.sobunsobun.pod.dto;

import java.util.List;

/**
 * 채팅 이전 메시지 목록 + 내 라벨.
 * myLabel: 대표면 "대표", 이미 말한 적 있는 이웃이면 "이웃 N", 아직 한 번도 안 보냈으면 null
 * (이웃 번호는 처음 말한 순서로 정해지므로, 첫 메시지를 보내면 그 응답의 senderLabel이 내 라벨이 된다).
 */
public record ChatHistoryResponse(String myLabel, List<ChatMessageResponse> messages) {
}
