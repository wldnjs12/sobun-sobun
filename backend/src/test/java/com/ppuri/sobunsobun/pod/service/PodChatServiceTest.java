package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.ChatMessage;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.dto.ChatHistoryResponse;
import com.ppuri.sobunsobun.pod.dto.ChatMessageResponse;
import com.ppuri.sobunsobun.pod.repository.ChatMessageRepository;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 공통 준비에서 "팟 1번: 대표 100, 참여자 7·8, 같은 건물 아닌 사람 없음"을 깔아둔다.
 * 저장된 메시지는 messages 리스트에 쌓여서, 저장소가 실제처럼 순서대로 돌려준다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PodChatServiceTest {

    private static final Long POD_ID = 1L;
    private static final Long HOST = 100L;
    private static final Long NEIGHBOR_A = 7L;
    private static final Long NEIGHBOR_B = 8L;
    private static final Long OUTSIDER = 9L; // 같은 건물이지만 참여 안 함

    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private PodRepository podRepository;
    @Mock
    private PodParticipantRepository podParticipantRepository;
    @Mock
    private BuildingAccessService buildingAccessService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private PodChatService podChatService;
    private final List<ChatMessage> messages = new ArrayList<>();

    @BeforeEach
    void setUp() {
        PodChatGuard guard = new PodChatGuard(podRepository, podParticipantRepository, buildingAccessService);
        podChatService = new PodChatService(chatMessageRepository, guard, messagingTemplate);

        Pod pod = Pod.builder()
                .buildingId(1L).hostUserId(HOST).title("생수 2L×24병")
                .totalAmount(new BigDecimal("14400")).targetParticipantCount(4)
                .commissionRate(new BigDecimal("0.05")).deadline(LocalDateTime.now().plusDays(1))
                .build();
        ReflectionTestUtils.setField(pod, "id", POD_ID);
        when(podRepository.findById(POD_ID)).thenReturn(Optional.of(pod));
        when(podParticipantRepository.existsByPodIdAndUserId(eq(POD_ID), any()))
                .thenAnswer(inv -> List.of(HOST, NEIGHBOR_A, NEIGHBOR_B).contains(inv.getArgument(1)));

        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", (long) messages.size() + 1);
            messages.add(m);
            return m;
        });
        when(chatMessageRepository.findByPodIdOrderByIdAsc(POD_ID)).thenAnswer(inv -> List.copyOf(messages));
    }

    @Test
    void 보낸_메시지는_저장되고_채팅_주소로_방송된다() {
        ChatMessageResponse sent = podChatService.send(POD_ID, NEIGHBOR_A, "  몇 시에 받을 수 있나요?  ");

        assertThat(sent.content()).isEqualTo("몇 시에 받을 수 있나요?"); // 앞뒤 공백 제거
        assertThat(sent.senderLabel()).isEqualTo("이웃 1");
        verify(messagingTemplate).convertAndSend("/topic/pods/1/chat", sent);
    }

    @Test
    void 대표는_대표_이웃은_처음_말한_순서대로_번호가_붙는다() {
        podChatService.send(POD_ID, NEIGHBOR_B, "안녕하세요");
        podChatService.send(POD_ID, HOST, "내일 저녁 7시에 1층에서 나눠요");
        podChatService.send(POD_ID, NEIGHBOR_A, "좋아요");
        podChatService.send(POD_ID, NEIGHBOR_B, "감사합니다");

        ChatHistoryResponse history = podChatService.history(POD_ID, NEIGHBOR_A, null);

        assertThat(history.messages()).extracting(ChatMessageResponse::senderLabel)
                .containsExactly("이웃 1", "대표", "이웃 2", "이웃 1");
        assertThat(history.myLabel()).isEqualTo("이웃 2");
        assertThat(podChatService.history(POD_ID, HOST, null).myLabel()).isEqualTo("대표");
    }

    @Test
    void 아직_말하지_않은_참여자의_내_라벨은_null이다() {
        podChatService.send(POD_ID, HOST, "반가워요");

        assertThat(podChatService.history(POD_ID, NEIGHBOR_A, null).myLabel()).isNull();
    }

    @Test
    void after를_주면_그보다_새_메시지만_돌려준다() {
        podChatService.send(POD_ID, HOST, "첫 번째");
        podChatService.send(POD_ID, NEIGHBOR_A, "두 번째");
        podChatService.send(POD_ID, HOST, "세 번째");

        ChatHistoryResponse history = podChatService.history(POD_ID, NEIGHBOR_A, 1L);

        assertThat(history.messages()).extracting(ChatMessageResponse::content).containsExactly("두 번째", "세 번째");
    }

    @Test
    void 참여하지_않은_사람은_읽지도_보내지도_못한다() {
        assertThatThrownBy(() -> podChatService.history(POD_ID, OUTSIDER, null))
                .isInstanceOf(PodForbiddenException.class);
        assertThatThrownBy(() -> podChatService.send(POD_ID, OUTSIDER, "끼워주세요"))
                .isInstanceOf(PodForbiddenException.class);
        verify(chatMessageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void 다른_건물_사람은_403_BUILDING_ACCESS_DENIED() {
        doThrow(new BuildingAccessDeniedException("다른 건물이에요"))
                .when(buildingAccessService).requireMembership(NEIGHBOR_A, 1L);

        assertThatThrownBy(() -> podChatService.history(POD_ID, NEIGHBOR_A, null))
                .isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 빈_메시지와_500자_넘는_메시지는_거부한다() {
        assertThatThrownBy(() -> podChatService.send(POD_ID, HOST, "   "))
                .isInstanceOf(PodRuleViolationException.class);
        assertThatThrownBy(() -> podChatService.send(POD_ID, HOST, null))
                .isInstanceOf(PodRuleViolationException.class);
        assertThatThrownBy(() -> podChatService.send(POD_ID, HOST, "가".repeat(501)))
                .isInstanceOf(PodRuleViolationException.class);

        assertThat(podChatService.send(POD_ID, HOST, "가".repeat(500)).content()).hasSize(500);
        verify(chatMessageRepository, times(1)).save(any());
    }
}
