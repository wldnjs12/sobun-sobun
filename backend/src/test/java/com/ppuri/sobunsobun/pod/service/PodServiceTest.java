package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.dto.MyParticipationResponse;
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
import java.util.Optional;

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
    private BuildingAccessService buildingAccessService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private PodService newService() {
        return new PodService(podRepository, podParticipantRepository, buildingRepository, buildingAccessService, messagingTemplate);
    }

    private PodCreateRequest newCreateRequest() {
        return new PodCreateRequest(1L, 100L, "생수 30박스", new BigDecimal("30000"), 3, null, null, null);
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
    void 건물은_존재해도_대표가_그_건물_소속이_아니면_팟_생성이_거부된다() {
        PodService podService = newService();
        when(buildingRepository.existsById(1L)).thenReturn(true);
        doThrow(new BuildingAccessDeniedException("다른 건물의 팟에는 접근할 수 없어요."))
                .when(buildingAccessService).requireMembership(100L, 1L);

        assertThatThrownBy(() -> podService.create(newCreateRequest()))
                .isInstanceOf(BuildingAccessDeniedException.class);

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

        List<PodResponse> result = podService.list(1L, 999L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).title()).isEqualTo("팟2");
        assertThat(result.get(1).title()).isEqualTo("팟1");
    }

    @Test
    void 요청자가_그_건물_소속이_아니면_목록_조회가_거부된다() {
        PodService podService = newService();
        doThrow(new BuildingAccessDeniedException("다른 건물의 팟에는 접근할 수 없어요."))
                .when(buildingAccessService).requireMembership(999L, 1L);

        assertThatThrownBy(() -> podService.list(1L, 999L)).isInstanceOf(BuildingAccessDeniedException.class);

        verify(podRepository, never()).findByBuildingIdAndClosedFalseOrderByIdDesc(any());
    }

    private Pod samplePod() {
        return Pod.builder()
                .buildingId(1L).hostUserId(100L).title("팟1")
                .totalAmount(new BigDecimal("10000")).targetParticipantCount(2)
                .commissionRate(new BigDecimal("0.05")).build();
    }

    @Test
    void 참여하지_않았으면_참여_상태는_joined_false이고_PIN이_없다() {
        PodService podService = newService();
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdAndUserId(1L, 999L)).thenReturn(Optional.empty());

        MyParticipationResponse response = podService.getMyParticipation(1L, 999L);

        assertThat(response.joined()).isFalse();
        assertThat(response.pickupPin()).isNull();
    }

    @Test
    void 참여한_사람이_보냈어요를_누르면_paid가_true가_된다() {
        PodService podService = newService();
        Pod pod = samplePod();
        PodParticipant participant = PodParticipant.builder().podId(1L).userId(7L).build();
        when(podRepository.findById(1L)).thenReturn(Optional.of(pod));
        when(podParticipantRepository.findByPodIdAndUserId(1L, 7L)).thenReturn(Optional.of(participant));

        MyParticipationResponse response = podService.markPaid(1L, 7L);

        assertThat(response.paid()).isTrue();
        assertThat(response.pickedUp()).isFalse();
        assertThat(response.pickupPin()).isEqualTo(pod.getPickupPin());
    }

    @Test
    void 참여하지_않은_사람은_보냈어요를_누를_수_없다() {
        PodService podService = newService();
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdAndUserId(1L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> podService.markPaid(1L, 7L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 대표가_아니면_참여자_현황을_볼_수_없다() {
        PodService podService = newService();
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));

        assertThatThrownBy(() -> podService.listParticipants(1L, 999L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 다른_건물_소속이면_팟_참여가_거부된다() {
        PodService podService = newService();
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        doThrow(new BuildingAccessDeniedException("다른 건물의 팟에는 접근할 수 없어요."))
                .when(buildingAccessService).requireMembership(999L, 1L);

        assertThatThrownBy(() -> podService.join(1L, 999L)).isInstanceOf(BuildingAccessDeniedException.class);

        verify(podParticipantRepository, never()).save(any());
    }
}
