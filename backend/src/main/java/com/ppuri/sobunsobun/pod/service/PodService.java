package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.LocationCheckPurpose;
import com.ppuri.sobunsobun.auth.service.LocationCheckService;
import com.ppuri.sobunsobun.auth.service.NeighborhoodService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodCategory;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.domain.PodStatus;
import com.ppuri.sobunsobun.pod.dto.MyParticipationResponse;
import com.ppuri.sobunsobun.pod.dto.ParticipantStatusResponse;
import com.ppuri.sobunsobun.pod.dto.PodAmountUpdateEvent;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.dto.PodUpdateRequest;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * 팟 개설·조회·참여·수정·취소·마감.
 *
 * 접근 범위(2026-11 기획 개편): 같은 건물 → **동네(내 건물 반경 1km)**. 판정은 NeighborhoodService가 한다.
 * 단, 이미 참여했거나 대표인 팟은 (이사 등으로 동네가 바뀌어도) 계속 볼 수 있다 — 정산·픽업을 끝내야 하니까.
 */
@Service
@RequiredArgsConstructor
public class PodService {

    private static final String NO_BUILDING_MESSAGE = "건물 등록을 먼저 마쳐주세요.";

    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;
    private final BuildingRepository buildingRepository;
    private final NeighborhoodService neighborhoodService;
    private final LocationCheckService locationCheckService;
    private final SimpMessagingTemplate messagingTemplate;

    /** 개설 + 대표 자동 참여(participantCount = 1). 대표 = 요청자, 건물 = 요청자의 등록 건물. */
    @Transactional
    public PodResponse create(PodCreateRequest request, Long hostUserId) {
        Building myBuilding = neighborhoodService.findMyBuilding(hostUserId)
                .orElseThrow(() -> new BuildingAccessDeniedException(NO_BUILDING_MESSAGE));
        locationCheckService.requireRecentPass(hostUserId, myBuilding.getId(), LocationCheckPurpose.POD_CREATE);
        Pod.validateUnits(request.totalUnits(), request.unitsPerPerson(), request.targetParticipantCount(), request.unitLabel());

        Pod pod = Pod.builder()
                .buildingId(myBuilding.getId())
                .hostUserId(hostUserId)
                .category(request.category())
                .title(request.title().trim())
                .description(blankToNull(request.description()))
                .totalAmount(request.totalAmount())
                .totalUnits(request.totalUnits())
                .unitLabel(request.unitLabel().trim())
                .unitsPerPerson(request.unitsPerPerson())
                .targetParticipantCount(request.targetParticipantCount())
                .commissionRate(request.commissionRateOrDefault())
                .deadline(request.deadline())
                .pickupNote(blankToNull(request.pickupNote()))
                .originalPrice(request.originalPrice())
                .build();
        // 대표도 1명분을 가져가므로 개설과 동시에 참여자로 넣는다 (예전엔 프론트가 개설 직후 join을 따로 호출했음)
        pod.join();
        Pod saved = podRepository.save(pod);
        podParticipantRepository.save(PodParticipant.builder().podId(saved.getId()).userId(hostUserId).build());
        return toResponse(saved, hostUserId);
    }

    @Transactional
    public PodResponse join(Long podId, Long userId) {
        Pod pod = getPodForUpdate(podId);
        if (podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            throw new IllegalStateException("이미 참여한 팟입니다.");
        }
        neighborhoodService.requireNeighbor(userId, pod.getBuildingId());
        // 예전 프론트는 개설 직후 대표를 따로 join시켰다. 개설할 때 이미 위치를 확인했으므로 대표는 위치 재확인 면제
        if (!pod.isHost(userId)) {
            locationCheckService.requireRecentPass(userId, pod.getBuildingId(), LocationCheckPurpose.POD_JOIN);
        }
        pod.join(LocalDateTime.now());
        podParticipantRepository.save(PodParticipant.builder().podId(podId).userId(userId).build());
        broadcast(pod);
        return toResponse(pod, userId);
    }

    @Transactional
    public PodResponse cancelJoin(Long podId, Long userId) {
        Pod pod = getPodForUpdate(podId);
        if (pod.isHost(userId)) {
            throw new IllegalStateException("대표는 참여를 취소할 수 없어요. 대신 모집 취소를 이용해주세요.");
        }
        if (!podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            throw new IllegalStateException("참여하지 않은 팟입니다.");
        }
        pod.cancelJoin();
        podParticipantRepository.deleteByPodIdAndUserId(podId, userId);
        broadcast(pod);
        return toResponse(pod, userId);
    }

    @Transactional
    public PodResponse close(Long podId, Long hostUserId) {
        Pod pod = getPodForUpdate(podId);
        pod.close(hostUserId);
        broadcast(pod);
        return toResponse(pod, hostUserId);
    }

    /** 대표의 모집 취소. 참여자들은 상세에서 "취소된 공동구매" 상태를 보게 된다. */
    @Transactional
    public PodResponse cancel(Long podId, Long hostUserId) {
        Pod pod = getPodForUpdate(podId);
        pod.cancel(hostUserId);
        broadcast(pod);
        return toResponse(pod, hostUserId);
    }

    /** 대표의 글 수정 — 모집중 + 대표 외 참여자 없음일 때만 (규칙은 Pod.update). */
    @Transactional
    public PodResponse update(Long podId, Long hostUserId, PodUpdateRequest request) {
        Pod pod = getPodForUpdate(podId);
        boolean hasOthers = podParticipantRepository.findByPodIdOrderByJoinedAt(podId).stream()
                .anyMatch(p -> !Objects.equals(p.getUserId(), pod.getHostUserId()));
        pod.update(hostUserId, hasOthers, request.toChange());
        broadcast(pod);
        return toResponse(pod, hostUserId);
    }

    @Transactional(readOnly = true)
    public PodResponse getDetail(Long podId, Long userId) {
        Pod pod = getPod(podId);
        requireAccess(pod, userId);
        return toResponse(pod, userId);
    }

    /**
     * 동네 홈 목록. 동네(반경 1km) 건물들의 팟 중 필터에 맞는 것만.
     *
     * @param keyword  제목·설명에 포함된 글자(대소문자 무시). 비우면 전체
     * @param category PodCategory 이름. 비우거나 ALL이면 전체
     * @param status   OPEN(기본: 모집중이고 마감 시간이 안 지난 것) | ALL(취소·마감 포함, 모집중이 먼저)
     * @param sort     DEADLINE(기본: 마감 임박순) | NEWEST(최신순)
     */
    @Transactional(readOnly = true)
    public List<PodResponse> list(Long userId, String keyword, String category, String status, String sort) {
        PodCategory categoryFilter = PodCategory.fromParam(category);
        boolean openOnly = parseOpenOnly(status);
        List<Long> nearby = neighborhoodService.nearbyBuildingIds(userId);
        if (nearby.isEmpty()) return List.of();

        boolean newest = "NEWEST".equalsIgnoreCase(sort);
        String needle = keyword == null || keyword.isBlank() ? null : keyword.trim().toLowerCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now();

        Comparator<Pod> order = Comparator.comparingInt((Pod p) -> recruiting(p, now) ? 0 : 1);
        if (!newest) {
            // 마감 시간 없는 옛 데이터는 뒤로
            order = order.thenComparing(Pod::getDeadline, Comparator.nullsLast(Comparator.naturalOrder()));
        }
        order = order.thenComparing(Pod::getId, Comparator.nullsLast(Comparator.reverseOrder()));

        List<Pod> pods = podRepository.findByBuildingIdInOrderByIdDesc(nearby).stream()
                .filter(p -> !openOnly || recruiting(p, now))
                .filter(p -> categoryFilter == null || p.getCategory() == categoryFilter)
                .filter(p -> needle == null || contains(p.getTitle(), needle) || contains(p.getDescription(), needle))
                .sorted(order)
                .toList();
        return toResponses(pods, userId);
    }

    /** 마이페이지 — role=host: 내가 연 팟, role=joined: 내가 참여한 팟(내가 연 팟 제외). */
    @Transactional(readOnly = true)
    public List<PodResponse> listMine(Long userId, String role) {
        if ("joined".equalsIgnoreCase(role)) {
            List<Long> podIds = podParticipantRepository.findByUserIdOrderByJoinedAtDesc(userId).stream()
                    .map(PodParticipant::getPodId)
                    .toList();
            Map<Long, Pod> byId = new HashMap<>();
            podRepository.findAllById(podIds).forEach(p -> byId.put(p.getId(), p));
            List<Pod> pods = podIds.stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .filter(p -> !p.isHost(userId))
                    .toList();
            return toResponses(pods, userId);
        }
        if (role == null || role.isBlank() || "host".equalsIgnoreCase(role)) {
            return toResponses(podRepository.findByHostUserIdOrderByIdDesc(userId), userId);
        }
        throw new PodRuleViolationException("role은 host 또는 joined만 쓸 수 있어요.");
    }

    /** 참여자 본인의 참여/송금/수령 상태 + 픽업 PIN. 참여 안 했으면 PIN 없이 joined=false만 내려준다. */
    @Transactional(readOnly = true)
    public MyParticipationResponse getMyParticipation(Long podId, Long userId) {
        Pod pod = getPod(podId);
        Optional<PodParticipant> mine = podParticipantRepository.findByPodIdAndUserId(podId, userId);
        if (mine.isEmpty()) {
            requireAccess(pod, userId);
            return MyParticipationResponse.notJoined();
        }
        return MyParticipationResponse.from(pod, mine.get());
    }

    /** 대표가 보는 참여자별 송금/수령 현황 (대표 본인만 조회 가능). */
    @Transactional(readOnly = true)
    public List<ParticipantStatusResponse> listParticipants(Long podId, Long hostUserId) {
        Pod pod = getPod(podId);
        if (!pod.isHost(hostUserId)) {
            throw new PodForbiddenException("대표만 참여자 현황을 볼 수 있습니다.");
        }
        return podParticipantRepository.findByPodIdOrderByJoinedAt(podId).stream()
                .map(ParticipantStatusResponse::from)
                .toList();
    }

    @Transactional
    public MyParticipationResponse markPaid(Long podId, Long userId) {
        Pod pod = getPod(podId);
        PodParticipant participant = getMyParticipant(podId, userId);
        participant.markPaid();
        return MyParticipationResponse.from(pod, participant);
    }

    @Transactional
    public MyParticipationResponse markPickedUp(Long podId, Long userId) {
        Pod pod = getPod(podId);
        PodParticipant participant = getMyParticipant(podId, userId);
        participant.markPickedUp();
        return MyParticipationResponse.from(pod, participant);
    }

    /** 대표·참여자는 항상 통과, 그 외에는 동네 이웃이어야 한다 (아니면 403). */
    private void requireAccess(Pod pod, Long userId) {
        if (pod.isHost(userId) || podParticipantRepository.existsByPodIdAndUserId(pod.getId(), userId)) return;
        neighborhoodService.requireNeighbor(userId, pod.getBuildingId());
    }

    private static boolean parseOpenOnly(String status) {
        if (status == null || status.isBlank() || "OPEN".equalsIgnoreCase(status)) return true;
        if ("ALL".equalsIgnoreCase(status)) return false;
        throw new PodRuleViolationException("status는 OPEN 또는 ALL만 쓸 수 있어요.");
    }

    /** "모집중" = 상태 OPEN + 마감 시간 안 지남 */
    private static boolean recruiting(Pod pod, LocalDateTime now) {
        return pod.getStatus() == PodStatus.OPEN && !pod.isDeadlinePassed(now);
    }

    private static boolean contains(String text, String needle) {
        return text != null && text.toLowerCase(Locale.ROOT).contains(needle);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private PodResponse toResponse(Pod pod, Long viewerId) {
        return toResponses(List.of(pod), viewerId).get(0);
    }

    /** 위치 문구(법정동·대략 거리)를 붙여 응답으로 바꾼다. 건물은 한 번에 모아서 조회한다. */
    private List<PodResponse> toResponses(List<Pod> pods, Long viewerId) {
        if (pods.isEmpty()) return List.of();
        Map<Long, Building> buildings = new HashMap<>();
        buildingRepository.findAllById(pods.stream().map(Pod::getBuildingId).filter(Objects::nonNull).distinct().toList())
                .forEach(b -> buildings.put(b.getId(), b));
        Long myBuildingId = neighborhoodService.findMyBuilding(viewerId).map(Building::getId).orElse(null);
        Map<Long, String> distanceCache = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        return pods.stream().map(pod -> {
            Building b = buildings.get(pod.getBuildingId());
            String neighborhoodName = b == null ? null : NeighborhoodService.neighborhoodName(b.getRoadAddress());
            String distanceLabel = pod.getBuildingId() == null ? null : distanceCache.computeIfAbsent(pod.getBuildingId(), id -> {
                boolean same = id.equals(myBuildingId);
                Double meters = same ? null : neighborhoodService.distanceMeters(viewerId, id);
                return Objects.toString(NeighborhoodService.roughDistanceLabel(meters, same), "");
            });
            return PodResponse.of(pod, viewerId, neighborhoodName,
                    distanceLabel == null || distanceLabel.isEmpty() ? null : distanceLabel, now);
        }).toList();
    }

    private PodParticipant getMyParticipant(Long podId, Long userId) {
        return podParticipantRepository.findByPodIdAndUserId(podId, userId)
                .orElseThrow(() -> new IllegalStateException("참여하지 않은 팟입니다."));
    }

    private Pod getPodForUpdate(Long podId) {
        return podRepository.findByIdForUpdate(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }

    private Pod getPod(Long podId) {
        return podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }

    private void broadcast(Pod pod) {
        messagingTemplate.convertAndSend(
                "/topic/pods/" + pod.getId(),
                new PodAmountUpdateEvent(pod.getId(), pod.getParticipantCount(), pod.calculatePerPersonAmount(),
                        pod.getClosed(), pod.getStatus().name())
        );
    }
}
