package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.pod.domain.ChatMessage;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.dto.ChatHistoryResponse;
import com.ppuri.sobunsobun.pod.dto.ChatMessageResponse;
import com.ppuri.sobunsobun.pod.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 팟 참여자 채팅. 채팅방은 팟마다 1개(podId로 바로 접근), 대표 + 참여자만 읽고 쓴다 (PodChatGuard).
 *
 * 흐름: 보내기는 REST(POST) → 저장 → /topic/pods/{podId}/chat 으로 방송 → 구독 중인 참여자 화면에 바로 추가.
 * 왜 보내기를 STOMP가 아니라 REST로 하나: STOMP로 보내다 에러(빈 메시지·권한 없음)가 나면 서버가 ERROR 프레임을 보내고
 * 연결 자체가 끊긴다. REST는 다른 API처럼 400/403 + 안내 문구로 끝나고, 실시간 연결은 그대로 유지된다.
 */
@Service
@RequiredArgsConstructor
public class PodChatService {

    static final String HOST_LABEL = "대표";

    private final ChatMessageRepository chatMessageRepository;
    private final PodChatGuard podChatGuard;
    private final SimpMessagingTemplate messagingTemplate;

    /** 채팅 STOMP 주소. 금액 갱신(/topic/pods/{id})과 섞이지 않게 /chat을 붙인다. */
    public static String topicOf(Long podId) {
        return "/topic/pods/" + podId + "/chat";
    }

    /**
     * 이전 메시지 (보낸 순서). afterId를 주면 그보다 새 메시지만 — 실시간 연결이 끊겼을 때 화면이 빈 곳을 채우는 용도.
     */
    @Transactional(readOnly = true)
    public ChatHistoryResponse history(Long podId, Long userId, Long afterId) {
        Pod pod = podChatGuard.requireChatMember(podId, userId);
        List<ChatMessage> all = chatMessageRepository.findByPodIdOrderByIdAsc(podId);
        Map<Long, String> labels = labelsOf(all, pod.getHostUserId());
        List<ChatMessageResponse> messages = all.stream()
                .filter(m -> afterId == null || m.getId() > afterId)
                .map(m -> ChatMessageResponse.of(m, labels.get(m.getSenderId())))
                .toList();
        String myLabel = pod.isHost(userId) ? HOST_LABEL : labels.get(userId);
        return new ChatHistoryResponse(myLabel, messages);
    }

    @Transactional
    public ChatMessageResponse send(Long podId, Long userId, String rawContent) {
        String content = rawContent == null ? "" : rawContent.strip();
        if (content.isEmpty()) {
            throw new PodRuleViolationException("메시지를 입력해주세요.");
        }
        if (content.length() > ChatMessage.MAX_LENGTH) {
            throw new PodRuleViolationException("메시지는 500자 이하로 보내주세요.");
        }
        Pod pod = podChatGuard.requireChatMember(podId, userId);

        ChatMessage saved = chatMessageRepository.save(new ChatMessage(podId, userId, content, LocalDateTime.now()));
        Map<Long, String> labels = labelsOf(chatMessageRepository.findByPodIdOrderByIdAsc(podId), pod.getHostUserId());
        ChatMessageResponse response = ChatMessageResponse.of(saved, labels.get(userId));
        messagingTemplate.convertAndSend(topicOf(podId), response);
        return response;
    }

    /**
     * 보낸 사람 id → 화면 라벨. 대표는 "대표", 나머지는 채팅에서 처음 말한 순서대로 "이웃 1, 이웃 2…".
     * 커뮤니티 댓글의 "이웃 N"과 같은 방식(PRODUCT_SPEC 6.14). 참여 순서로 매기면 누가 나갔을 때 번호가 밀려서
     * 옛 메시지의 라벨이 바뀌므로, 메시지 기록만으로 정한다.
     */
    static Map<Long, String> labelsOf(List<ChatMessage> messagesInOrder, Long hostUserId) {
        Map<Long, String> labels = new HashMap<>();
        if (hostUserId != null) labels.put(hostUserId, HOST_LABEL);
        int neighbor = 0;
        for (ChatMessage message : messagesInOrder) {
            if (!labels.containsKey(message.getSenderId())) {
                labels.put(message.getSenderId(), "이웃 " + (++neighbor));
            }
        }
        return labels;
    }
}
