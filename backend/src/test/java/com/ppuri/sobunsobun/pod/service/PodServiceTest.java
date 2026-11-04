package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.LocationCheckPurpose;
import com.ppuri.sobunsobun.auth.service.LocationCheckException;
import com.ppuri.sobunsobun.auth.service.LocationCheckService;
import com.ppuri.sobunsobun.auth.service.NeighborhoodService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodCategory;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.dto.MyParticipationResponse;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.dto.PodUpdateRequest;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 공통 준비(setUp)에서 "내 건물 = 1번, 용현동"을 깔아두기 때문에 테스트마다 안 쓰는 stub이 생긴다.
 * 그래서 LENIENT(안 쓴 stub이 있어도 실패하지 않음)로 둔다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PodServiceTest {

    private static final Long HOST = 100L;
    private static final Long NEIGHBOR = 7L;

    @Mock
    private PodRepository podRepository;
    @Mock
    private PodParticipantRepository podParticipantRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private NeighborhoodService neighborhoodService;
    @Mock
    private LocationCheckService locationCheckService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private PodService podService;
    private Building myBuilding;

    @BeforeEach
    void setUp() {
        podService = new PodService(podRepository, podParticipantRepository, buildingRepository, neighborhoodService,
                locationCheckService, messagingTemplate);
        myBuilding = new Building("테스트빌라", "인천광역시 미추홀구 인하로 100 (용현동)", "bd1", null, "bd1", 37.45, 126.65);
        ReflectionTestUtils.setField(myBuilding, "id", 1L);
        when(neighborhoodService.findMyBuilding(anyLong())).thenReturn(Optional.of(myBuilding));
        when(buildingRepository.findAllById(any())).thenReturn(List.of(myBuilding));
        when(podRepository.save(any(Pod.class))).thenAnswer(inv -> {
            Pod p = inv.getArgument(0);
            ReflectionTestUtils.setField(p, "id", 1L);
            return p;
        });
    }

    private PodCreateRequest createRequest(int totalUnits, int unitsPerPerson, int target) {
        return new PodCreateRequest(null, 999L, PodCategory.TISSUE, "깨끗한나라 화장지 30롤", null,
                new BigDecimal("30000"), target, totalUnits, "롤", unitsPerPerson, null,
                LocalDateTime.now().plusDays(1), "1층 공동현관 앞", null);
    }

    private Pod pod(long id, String title, String description, PodCategory category, LocalDateTime deadline) {
        Pod p = Pod.builder()
                .buildingId(1L).hostUserId(HOST).title(title).description(description).category(category)
                .totalAmount(new BigDecimal("10000")).targetParticipantCount(3)
                .totalUnits(30).unitLabel("롤").unitsPerPerson(10)
                .commissionRate(new BigDecimal("0.05")).deadline(deadline).build();
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }

    private Pod samplePod() {
        Pod p = pod(1L, "팟1", null, PodCategory.TISSUE, LocalDateTime.now().plusDays(1));
        p.join(); // 대표 자동 참여
        return p;
    }

    // ── 개설 ──

    @Test
    void 개설하면_요청자가_대표가_되고_자동_참여한다() {
        PodResponse response = podService.create(createRequest(30, 10, 3), HOST);

        // 본문의 hostUserId(999)는 무시하고 헤더의 요청자(100)를 대표로 쓴다
        assertThat(response.hostUserId()).isEqualTo(HOST);
        assertThat(response.isHost()).isTrue();
        assertThat(response.buildingId()).isEqualTo(1L);
        assertThat(response.participantCount()).isEqualTo(1);
        assertThat(response.categoryLabel()).isEqualTo("휴지·물티슈");
        assertThat(response.neighborhoodName()).isEqualTo("용현동");
        assertThat(response.distanceLabel()).isEqualTo("같은 건물");
        assertThat(response.status()).isEqualTo("OPEN");
        verify(podParticipantRepository).save(any(PodParticipant.class));
    }

    @Test
    void 일인당_개수_곱하기_목표인원이_총_개수보다_많으면_개설이_거절된다() {
        assertThatThrownBy(() -> podService.create(createRequest(30, 10, 4), HOST))
                .isInstanceOf(PodRuleViolationException.class);

        verify(podRepository, never()).save(any());
    }

    @Test
    void 건물_등록_전이면_개설이_거절된다() {
        when(neighborhoodService.findMyBuilding(HOST)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> podService.create(createRequest(30, 10, 3), HOST))
                .isInstanceOf(BuildingAccessDeniedException.class);

        verify(podRepository, never()).save(any());
    }

    @Test
    void 최근_위치_확인_기록이_없으면_팟_생성이_거부된다() {
        doThrow(new LocationCheckException("LOCATION_CHECK_REQUIRED", "위치 확인이 필요해요."))
                .when(locationCheckService).requireRecentPass(HOST, 1L, LocationCheckPurpose.POD_CREATE);

        assertThatThrownBy(() -> podService.create(createRequest(30, 10, 3), HOST))
                .isInstanceOf(LocationCheckException.class);

        verify(podRepository, never()).save(any());
    }

    // ── 목록: 동네 범위·검색·필터 ──

    @Test
    void 목록은_동네_건물의_팟만_조회하고_검색어와_카테고리로_거른다() {
        when(neighborhoodService.nearbyBuildingIds(NEIGHBOR)).thenReturn(List.of(1L, 2L));
        Pod tissue = pod(1L, "깨끗한나라 화장지 30롤", null, PodCategory.TISSUE, LocalDateTime.now().plusDays(1));
        Pod wipes = pod(2L, "물티슈 10팩", "화장지랑 같이 쓰기 좋아요", PodCategory.TISSUE, LocalDateTime.now().plusDays(2));
        Pod detergent = pod(3L, "액체세제 3L", null, PodCategory.LAUNDRY, LocalDateTime.now().plusDays(3));
        when(podRepository.findByBuildingIdInOrderByIdDesc(List.of(1L, 2L))).thenReturn(List.of(detergent, wipes, tissue));

        List<PodResponse> byKeyword = podService.list(NEIGHBOR, "화장지", null, null, null);
        assertThat(byKeyword).extracting(PodResponse::id).containsExactly(1L, 2L); // 제목·설명 모두 검색, 마감 임박순

        List<PodResponse> byCategory = podService.list(NEIGHBOR, null, "LAUNDRY", null, null);
        assertThat(byCategory).extracting(PodResponse::id).containsExactly(3L);
    }

    @Test
    void 기본_목록은_모집중만_보여주고_ALL이면_모집중을_먼저_보여준다() {
        when(neighborhoodService.nearbyBuildingIds(NEIGHBOR)).thenReturn(List.of(1L));
        Pod open = pod(1L, "휴지", null, PodCategory.TISSUE, LocalDateTime.now().plusDays(1));
        Pod cancelled = pod(2L, "세제", null, PodCategory.LAUNDRY, LocalDateTime.now().plusDays(1));
        cancelled.cancel(HOST);
        Pod expired = pod(3L, "샴푸", null, PodCategory.BATH, LocalDateTime.now().minusHours(1));
        when(podRepository.findByBuildingIdInOrderByIdDesc(List.of(1L))).thenReturn(List.of(expired, cancelled, open));

        assertThat(podService.list(NEIGHBOR, null, null, "OPEN", null)).extracting(PodResponse::id).containsExactly(1L);
        assertThat(podService.list(NEIGHBOR, null, null, "ALL", null)).extracting(PodResponse::id)
                .containsExactly(1L, 3L, 2L);
    }

    @Test
    void 건물_등록_전이면_목록이_비어있다() {
        when(neighborhoodService.nearbyBuildingIds(NEIGHBOR)).thenReturn(List.of());

        assertThat(podService.list(NEIGHBOR, null, null, null, null)).isEmpty();
        verify(podRepository, never()).findByBuildingIdInOrderByIdDesc(any());
    }

    @Test
    void 모르는_카테고리로_조회하면_400_규칙_위반이다() {
        assertThatThrownBy(() -> podService.list(NEIGHBOR, null, "FOOD", null, null))
                .isInstanceOf(PodRuleViolationException.class);
    }

    // ── 상세·참여 ──

    @Test
    void 동네_밖이면_상세_조회가_거부된다() {
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));
        doThrow(new BuildingAccessDeniedException("우리 동네(반경 1km) 밖의 공동구매예요."))
                .when(neighborhoodService).requireNeighbor(999L, 1L);

        assertThatThrownBy(() -> podService.getDetail(1L, 999L)).isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 동네_밖이면_팟_참여가_거부된다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        doThrow(new BuildingAccessDeniedException("우리 동네(반경 1km) 밖의 공동구매예요."))
                .when(neighborhoodService).requireNeighbor(999L, 1L);

        assertThatThrownBy(() -> podService.join(1L, 999L)).isInstanceOf(BuildingAccessDeniedException.class);

        verify(podParticipantRepository, never()).save(any());
    }

    @Test
    void 이웃이_참여하면_인원이_늘고_실시간_이벤트가_나간다() {
        Pod pod = samplePod();
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pod));

        PodResponse response = podService.join(1L, NEIGHBOR);

        assertThat(response.participantCount()).isEqualTo(2);
        assertThat(response.isHost()).isFalse();
        verify(messagingTemplate).convertAndSend(eq("/topic/pods/1"), any(Object.class));
    }

    @Test
    void 같은_팟에_두_번_참여할_수_없다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.existsByPodIdAndUserId(1L, NEIGHBOR)).thenReturn(true);

        assertThatThrownBy(() -> podService.join(1L, NEIGHBOR)).hasMessageContaining("이미 참여한");
    }

    @Test
    void 최근_위치_확인_기록이_없으면_팟_참여가_거부된다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        doThrow(new LocationCheckException("LOCATION_CHECK_REQUIRED", "위치 확인이 필요해요."))
                .when(locationCheckService).requireRecentPass(NEIGHBOR, 1L, LocationCheckPurpose.POD_JOIN);

        assertThatThrownBy(() -> podService.join(1L, NEIGHBOR)).isInstanceOf(LocationCheckException.class);

        verify(podParticipantRepository, never()).save(any());
    }

    @Test
    void 취소된_팟에는_참여할_수_없다() {
        Pod pod = samplePod();
        pod.cancel(HOST);
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pod));

        assertThatThrownBy(() -> podService.join(1L, NEIGHBOR)).hasMessageContaining("취소된");
    }

    @Test
    void 대표는_참여_취소를_할_수_없다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));

        assertThatThrownBy(() -> podService.cancelJoin(1L, HOST)).hasMessageContaining("모집 취소");
    }

    // ── 수정·취소 ──

    @Test
    void 대표_외_참여자가_있으면_수정할_수_없다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdOrderByJoinedAt(1L)).thenReturn(List.of(
                PodParticipant.builder().podId(1L).userId(HOST).build(),
                PodParticipant.builder().podId(1L).userId(NEIGHBOR).build()));
        PodUpdateRequest request = new PodUpdateRequest("새 제목", null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> podService.update(1L, HOST, request)).hasMessageContaining("참여한 이웃");
    }

    @Test
    void 대표만_있으면_수정되고_이벤트가_나간다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdOrderByJoinedAt(1L)).thenReturn(List.of(
                PodParticipant.builder().podId(1L).userId(HOST).build()));
        PodUpdateRequest request = new PodUpdateRequest("새 제목", "설명", PodCategory.DAILY, null, null, null, null, null,
                null, null, null);

        PodResponse response = podService.update(1L, HOST, request);

        assertThat(response.title()).isEqualTo("새 제목");
        assertThat(response.category()).isEqualTo("DAILY");
        verify(messagingTemplate).convertAndSend(eq("/topic/pods/1"), any(Object.class));
    }

    @Test
    void 대표가_아니면_모집_취소할_수_없다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));

        assertThatThrownBy(() -> podService.cancel(1L, NEIGHBOR)).isInstanceOf(PodForbiddenException.class);
    }

    @Test
    void 대표가_모집_취소하면_CANCELLED가_된다() {
        when(podRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(samplePod()));

        assertThat(podService.cancel(1L, HOST).status()).isEqualTo("CANCELLED");
    }

    // ── 마이페이지 ──

    @Test
    void 내가_참여한_팟에는_내가_연_팟이_빠진다() {
        Pod mine = pod(1L, "내 팟", null, PodCategory.TISSUE, null);
        Pod others = pod(2L, "이웃 팟", null, PodCategory.TISSUE, null);
        ReflectionTestUtils.setField(others, "hostUserId", 55L);
        when(podParticipantRepository.findByUserIdOrderByJoinedAtDesc(HOST)).thenReturn(List.of(
                PodParticipant.builder().podId(2L).userId(HOST).build(),
                PodParticipant.builder().podId(1L).userId(HOST).build()));
        when(podRepository.findAllById(List.of(2L, 1L))).thenReturn(List.of(mine, others));

        assertThat(podService.listMine(HOST, "joined")).extracting(PodResponse::id).containsExactly(2L);
    }

    // ── 정산·픽업용 (기존) ──

    @Test
    void 참여하지_않았으면_참여_상태는_joined_false이고_PIN이_없다() {
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdAndUserId(1L, 999L)).thenReturn(Optional.empty());

        MyParticipationResponse response = podService.getMyParticipation(1L, 999L);

        assertThat(response.joined()).isFalse();
        assertThat(response.pickupPin()).isNull();
    }

    @Test
    void 참여한_사람이_보냈어요를_누르면_paid가_true가_된다() {
        Pod pod = samplePod();
        PodParticipant participant = PodParticipant.builder().podId(1L).userId(NEIGHBOR).build();
        when(podRepository.findById(1L)).thenReturn(Optional.of(pod));
        when(podParticipantRepository.findByPodIdAndUserId(1L, NEIGHBOR)).thenReturn(Optional.of(participant));

        MyParticipationResponse response = podService.markPaid(1L, NEIGHBOR);

        assertThat(response.paid()).isTrue();
        assertThat(response.pickedUp()).isFalse();
        assertThat(response.pickupPin()).isEqualTo(pod.getPickupPin());
    }

    @Test
    void 참여하지_않은_사람은_보냈어요를_누를_수_없다() {
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));
        when(podParticipantRepository.findByPodIdAndUserId(1L, NEIGHBOR)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> podService.markPaid(1L, NEIGHBOR)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 대표가_아니면_참여자_현황을_볼_수_없다() {
        when(podRepository.findById(1L)).thenReturn(Optional.of(samplePod()));

        assertThatThrownBy(() -> podService.listParticipants(1L, 999L)).isInstanceOf(PodForbiddenException.class);
    }
}
