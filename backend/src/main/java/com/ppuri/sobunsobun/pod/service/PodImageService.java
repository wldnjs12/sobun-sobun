package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodImage;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.dto.PodImageResponse;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.repository.PodImageRepository;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 팟 상품 사진 등록·조회·삭제.
 *
 * 등록·삭제: 대표 + 모집중 + 대표 외 참여자 없음 (글 수정과 같은 조건, Pod.changeImage).
 * 조회: 같은 건물 소속만 (다른 건물이면 403 BUILDING_ACCESS_DENIED).
 */
@Service
@RequiredArgsConstructor
public class PodImageService {

    /** 프론트가 800px JPEG로 줄여서 보내면 보통 200KB 안팎이다. 줄이기에 실패한 원본이 와도 막을 수 있게 넉넉히 2MB. */
    static final long MAX_IMAGE_BYTES = 2 * 1024 * 1024;

    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;
    private final PodImageRepository podImageRepository;
    private final BuildingAccessService buildingAccessService;

    @Transactional
    public PodResponse upload(Long podId, Long userId, MultipartFile file) {
        byte[] data = readImage(file);
        String contentType = detectContentType(data);
        if (contentType == null) {
            throw new PodRuleViolationException("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
        }

        Pod pod = getPodForUpdate(podId);
        buildingAccessService.requireMembership(userId, pod.getBuildingId());
        pod.changeImage(userId, hasOtherParticipants(pod));

        LocalDateTime now = LocalDateTime.now();
        podImageRepository.findById(podId).ifPresentOrElse(
                image -> image.replace(contentType, data, now),
                () -> podImageRepository.save(new PodImage(podId, contentType, data, now)));
        return PodResponse.of(pod, userId, now);
    }

    @Transactional(readOnly = true)
    public PodImageResponse get(Long podId, Long userId) {
        Pod pod = getPod(podId);
        buildingAccessService.requireMembership(userId, pod.getBuildingId());
        if (pod.getImageVersion() == null) {
            throw new IllegalArgumentException("등록된 사진이 없어요.");
        }
        return podImageRepository.findById(podId)
                .map(image -> PodImageResponse.of(image, pod.getImageVersion()))
                .orElseThrow(() -> new IllegalArgumentException("등록된 사진이 없어요."));
    }

    @Transactional
    public PodResponse delete(Long podId, Long userId) {
        Pod pod = getPodForUpdate(podId);
        buildingAccessService.requireMembership(userId, pod.getBuildingId());
        pod.removeImage(userId, hasOtherParticipants(pod));
        podImageRepository.deleteById(podId);
        return PodResponse.of(pod, userId, LocalDateTime.now());
    }

    private boolean hasOtherParticipants(Pod pod) {
        return podParticipantRepository.findByPodIdOrderByJoinedAt(pod.getId()).stream()
                .anyMatch(p -> !Objects.equals(p.getUserId(), pod.getHostUserId()));
    }

    private static byte[] readImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new PodRuleViolationException("사진을 선택해주세요.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new PodRuleViolationException("사진 용량은 2MB 이하만 올릴 수 있어요.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new PodRuleViolationException("사진을 읽지 못했어요. 다시 올려주세요.");
        }
    }

    /**
     * Content-Type 헤더는 클라이언트가 마음대로 보낼 수 있어서, 파일 앞부분의 시그니처(매직 넘버)로 형식을 판별한다.
     * (정산 영수증의 SettlementService.detectImageFormat과 같은 방식 + WEBP)
     * @return "image/jpeg" / "image/png" / "image/webp", 셋 다 아니면 null
     */
    static String detectContentType(byte[] data) {
        if (data.length >= 3 && (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (data.length >= 8 && (data[0] & 0xFF) == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G'
                && data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A) {
            return "image/png";
        }
        if (data.length >= 12 && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private Pod getPodForUpdate(Long podId) {
        return podRepository.findByIdForUpdate(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }

    private Pod getPod(Long podId) {
        return podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }
}
