package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.ChatMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 채팅 메시지 보내기. 앞뒤 공백은 서버가 지우고 저장한다. */
public record ChatMessageRequest(
        @NotBlank(message = "메시지를 입력해주세요.")
        @Size(max = ChatMessage.MAX_LENGTH, message = "메시지는 500자 이하로 보내주세요.") String content
) {
}
