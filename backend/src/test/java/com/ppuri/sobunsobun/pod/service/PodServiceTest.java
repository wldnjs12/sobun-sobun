package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PodServiceTest {

    @Mock
    private PodRepository podRepository;
    @Mock
    private PodParticipantRepository podParticipantRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private PodService newService() {
        return new PodService(podRepository, podParticipantRepository, buildingRepository, messagingTemplate);
    }

    private PodCreateRequest newCreateRequest() {
        return new PodCreateRequest(1L, 100L, "생수 30박스", new BigDecimal("30000"), 3, null, null);
    }

    @Test
    void 존재하지_않는_buildingId면_팟_생성이_거부된다() {
        PodService podService = newService();
        when(buildingRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> podService.create(newCreateRequest()))
                .isInstanceOf(IllegalArgumentException.class);

        verify(podRepository, never()).save(any());
    }

    @Test
    void 존재하는_buildingId면_팟이_저장된다() {
        PodService podService = newService();
        when(buildingRepository.existsById(1L)).thenReturn(true);
        when(podRepository.save(any(Pod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PodResponse response = podService.create(newCreateRequest());

        assertThat(response.buildingId()).isEqualTo(1L);
        assertThat(response.hostUserId()).isEqualTo(100L);
        verify(podRepository).save(any(Pod.class));
    }

    @Test
    void list는_마감되지_않은_팟만_응답으로_변환한다() {
        PodService podService = newService();
        Pod pod1 = Pod.builder()
                .buildingId(1L).hostUserId(100L).title("팟1")
                .totalAmount(new BigDecimal("10000")).targetParticipantCount(2)
                .commissionRate(new BigDecimal("0.05")).build();
        Pod pod2 = Pod.builder()
                .buildingId(1L).hostUserId(200L).title("팟2")
                .totalAmount(new BigDecimal("20000")).targetParticipantCount(4)
                .commissionRate(new BigDecimal("0.05")).build();
        when(podRepository.findByBuildingIdAndClosedFalseOrderByIdDesc(1L)).thenReturn(List.of(pod2, pod1));

        List<PodResponse> result = podService.list(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).title()).isEqualTo("팟2");
        assertThat(result.get(1).title()).isEqualTo("팟1");
    }
}
