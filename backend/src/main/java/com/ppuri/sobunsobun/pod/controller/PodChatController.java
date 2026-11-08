package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.dto.ChatHistoryResponse;
import com.ppuri.sobunsobun.pod.dto.ChatMessageRequest;
import com.ppuri.sobunsobun.pod.dto.ChatMessageResponse;
import com.ppuri.sobunsobun.pod.service.PodChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 팟 참여자 채팅 (대표 + 참여자만, 아니면 403).
 * 새 메시지는 STOMP /topic/pods/{podId}/chat 으로도 방송된다 (구독도 참여자만 — PodSubscriptionInterceptor).
 *
 * 요청자는 PodController와 같이 X-User-Id 헤더로 받는다 (로그인 필터가 토큰 주인으로 덮어씀).
 */
@RestController
@RequestMapping("/api/pods/{podId}/messages")
@RequiredArgsConstructor
public class PodChatController {

    private static final String USER_ID = "X-User-Id";

    private final PodChatService podChatService;

    /** 이전 메시지(보낸 순서). ?after={메시지 id}면 그보다 새 것만 — 실시간 연결이 끊겼을 때 폴링용 */
    @GetMapping
    public ApiResponse<ChatHistoryResponse> history(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId,
                                                    @RequestParam(required = false) Long after) {
        return ApiResponse.ok(podChatService.history(podId, userId, after));
    }

    /** 메시지 보내기. 빈 메시지·500자 초과는 400 */
    @PostMapping
    public ApiResponse<ChatMessageResponse> send(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId,
                                                 @Valid @RequestBody ChatMessageRequest request) {
        return ApiResponse.ok(podChatService.send(podId, userId, request.content()));
    }
}
