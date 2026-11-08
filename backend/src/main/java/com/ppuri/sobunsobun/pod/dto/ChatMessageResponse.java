package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.ChatMessage;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 1건. 보낸 사람은 "대표" 또는 "이웃 N"(senderLabel)으로만 알려준다.
 * userId·닉네임은 넣지 않는다 (PRODUCT_SPEC D24 — 팟에서는 대표/이웃으로만 표시).
 * "내 메시지인지"는 화면이 senderLabel과 내 라벨(ChatHistoryResponse.myLabel)을 비교해서 판단한다.
 * (같은 메시지를 WebSocket으로 모두에게 똑같이 보내므로, 받는 사람마다 다른 값인 mine 같은 필드는 넣을 수 없다)
 */
public record ChatMessageResponse(Long id, Long podId, String senderLabel, String content, LocalDateTime createdAt) {

    public static ChatMessageResponse of(ChatMessage message, String senderLabel) {
        return new ChatMessageResponse(message.getId(), message.getPodId(), senderLabel, message.getContent(),
                message.getCreatedAt());
    }
}
