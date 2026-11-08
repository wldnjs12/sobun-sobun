package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.domain.PodImage;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import com.ppuri.sobunsobun.pod.dto.PodImageResponse;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.repository.PodImageRepository;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PodImageServiceTest {

    private static final Long POD_ID = 1L;
    private static final Long HOST = 100L;
    private static final Long NEIGHBOR = 7L;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 1};

    @Mock
    private PodRepository podRepository;
    @Mock
    private PodParticipantRepository podParticipantRepository;
    @Mock
    private PodImageRepository podImageRepository;
    @Mock
    private BuildingAccessService buildingAccessService;

    private PodImageService podImageService;
    private Pod pod;

    @BeforeEach
    void setUp() {
        podImageService = new PodImageService(podRepository, podParticipantRepository, podImageRepository,
                buildingAccessService);
        pod = Pod.builder()
                .buildingId(1L).hostUserId(HOST).title("액체세제 리필 2L 6개")
                .totalAmount(new BigDecimal("36000")).targetParticipantCount(3)
                .commissionRate(new BigDecimal("0.05")).deadline(LocalDateTime.now().plusDays(1))
                .build();
        pod.join(); // 대표 자동 참여
        ReflectionTestUtils.setField(pod, "id", POD_ID);
        when(podRepository.findByIdForUpdate(POD_ID)).thenReturn(Optional.of(pod));
        when(podRepository.findById(POD_ID)).thenReturn(Optional.of(pod));
        when(podParticipantRepository.findByPodIdOrderByJoinedAt(POD_ID))
                .thenReturn(List.of(PodParticipant.builder().podId(POD_ID).userId(HOST).build()));
        when(podImageRepository.findById(POD_ID)).thenReturn(Optional.empty());
    }

    private static MockMultipartFile file(byte[] data) {
        return new MockMultipartFile("image", "photo", "image/jpeg", data);
    }

    @Test
    void 파일_앞부분_시그니처로_JPG_PNG_WEBP를_판별한다() {
        assertThat(PodImageService.detectContentType(JPEG)).isEqualTo("image/jpeg");
        assertThat(PodImageService.detectContentType(PNG)).isEqualTo("image/png");
        assertThat(PodImageService.detectContentType(WEBP)).isEqualTo("image/webp");
        assertThat(PodImageService.detectContentType("GIF89a".getBytes())).isNull();
    }

    @Test
    void 대표가_사진을_올리면_저장되고_버전이_1이_된다() {
        PodResponse response = podImageService.upload(POD_ID, HOST, file(JPEG));

        ArgumentCaptor<PodImage> saved = ArgumentCaptor.forClass(PodImage.class);
        verify(podImageRepository).save(saved.capture());
        assertThat(saved.getValue().getPodId()).isEqualTo(POD_ID);
        assertThat(saved.getValue().getContentType()).isEqualTo("image/jpeg");
        assertThat(response.imageVersion()).isEqualTo(1);
    }

    @Test
    void 이미_사진이_있으면_같은_행을_교체한다() {
        PodImage existing = new PodImage(POD_ID, "image/jpeg", JPEG, LocalDateTime.now());
        when(podImageRepository.findById(POD_ID)).thenReturn(Optional.of(existing));

        podImageService.upload(POD_ID, HOST, file(PNG));

        verify(podImageRepository, never()).save(any());
        assertThat(existing.getContentType()).isEqualTo("image/png");
        assertThat(existing.getData()).isEqualTo(PNG);
    }

    @Test
    void 사진이_아닌_파일이나_2MB를_넘는_파일은_거절한다() {
        assertThatThrownBy(() -> podImageService.upload(POD_ID, HOST, file("hello".getBytes())))
                .isInstanceOf(PodRuleViolationException.class);
        byte[] tooBig = new byte[(int) PodImageService.MAX_IMAGE_BYTES + 1];
        System.arraycopy(JPEG, 0, tooBig, 0, JPEG.length);
        assertThatThrownBy(() -> podImageService.upload(POD_ID, HOST, file(tooBig)))
                .isInstanceOf(PodRuleViolationException.class);
        verify(podImageRepository, never()).save(any());
    }

    @Test
    void 대표가_아니면_사진을_올릴_수_없다() {
        assertThatThrownBy(() -> podImageService.upload(POD_ID, NEIGHBOR, file(JPEG)))
                .isInstanceOf(PodForbiddenException.class);
        verify(podImageRepository, never()).save(any());
    }

    @Test
    void 다른_건물_사람은_사진을_볼_수_없다() {
        pod.changeImage(HOST, false);
        doThrow(new BuildingAccessDeniedException("다른 건물이에요"))
                .when(buildingAccessService).requireMembership(NEIGHBOR, 1L);

        assertThatThrownBy(() -> podImageService.get(POD_ID, NEIGHBOR))
                .isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 사진_조회는_dataUrl과_버전을_돌려준다() {
        pod.changeImage(HOST, false);
        when(podImageRepository.findById(POD_ID))
                .thenReturn(Optional.of(new PodImage(POD_ID, "image/jpeg", JPEG, LocalDateTime.now())));

        PodImageResponse response = podImageService.get(POD_ID, NEIGHBOR);

        assertThat(response.version()).isEqualTo(1);
        assertThat(response.dataUrl()).startsWith("data:image/jpeg;base64,");
    }

    @Test
    void 사진을_지우면_버전이_null이_되고_행이_삭제된다() {
        pod.changeImage(HOST, false);

        PodResponse response = podImageService.delete(POD_ID, HOST);

        verify(podImageRepository).deleteById(POD_ID);
        assertThat(response.imageVersion()).isNull();
    }
}
