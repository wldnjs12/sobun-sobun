package com.ppuri.sobunsobun.settlement.service;

import com.ppuri.sobunsobun.auth.service.NeighborhoodService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.settlement.domain.Settlement;
import com.ppuri.sobunsobun.settlement.domain.SettlementRepository;
import com.ppuri.sobunsobun.settlement.dto.SettlementResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** 확정된 정산 결과 조회 단위 테스트 */
@ExtendWith(MockitoExtension.class)
class SettlementFindTest {

    private static final long POD_ID = 1L;
    private static final long BUILDING_ID = 10L;
    private static final long USER_ID = 2L;               // 같은 동네 참여자
    private static final long OTHER_BUILDING_USER_ID = 99L;

    @Mock
    private SettlementPodReader podReader;

    @Mock
    private SettlementRepository settlementRepository;

    @Mock
    private NeighborhoodService neighborhoodService;

    private SettlementService settlementService;

    @BeforeEach
    void setUp() {
        settlementService = new SettlementService(new StubReceiptOcrClient(), podReader, settlementRepository,
                neighborhoodService);
    }

    private static final long HOST_USER_ID = 1L;
    private static final long BYSTANDER_USER_ID = 3L;     // 같은 동네지만 이 팟에 참여하지 않음

    private void givenPodExists() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(new PodSummary(POD_ID, BUILDING_ID, HOST_USER_ID, 3, true)));
        org.mockito.Mockito.lenient().when(podReader.isParticipant(POD_ID, USER_ID)).thenReturn(true);
    }

    @Test
    void 확정된_정산이_있으면_결과를_돌려준다() {
        givenPodExists();
        Settlement settlement = new Settlement(POD_ID, new BigDecimal("12300"), new BigDecimal("0.05"),
                new BigDecimal("12915"), 3, new BigDecimal("4305"));
        given(settlementRepository.findFirstByPodIdAndConfirmedTrueOrderByIdDesc(POD_ID)).willReturn(Optional.of(settlement));

        SettlementResponse result = settlementService.findConfirmed(POD_ID, USER_ID);

        assertThat(result.podId()).isEqualTo(POD_ID);
        assertThat(result.finalAmount()).isEqualByComparingTo("12915");
        assertThat(result.participantCount()).isEqualTo(3);
        assertThat(result.perPersonAmount()).isEqualByComparingTo("4305");
        assertThat(result.confirmed()).isTrue();
        verify(neighborhoodService).requireNeighbor(USER_ID, BUILDING_ID, SettlementService.OTHER_BUILDING_MESSAGE);
    }

    @Test
    void 아직_확정_전이면_null() {
        givenPodExists();
        given(settlementRepository.findFirstByPodIdAndConfirmedTrueOrderByIdDesc(POD_ID)).willReturn(Optional.empty());

        assertThat(settlementService.findConfirmed(POD_ID, USER_ID)).isNull();
    }

    @Test
    void 없는_팟이면_에러가_아니라_null() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.empty());

        assertThat(settlementService.findConfirmed(POD_ID, USER_ID)).isNull();
        verifyNoInteractions(neighborhoodService, settlementRepository);
    }

    @Test
    void 동네_밖_사용자면_예외이고_정산을_조회하지_않는다() {
        givenPodExists();
        willThrow(new BuildingAccessDeniedException(SettlementService.OTHER_BUILDING_MESSAGE))
                .given(neighborhoodService)
                .requireNeighbor(OTHER_BUILDING_USER_ID, BUILDING_ID, SettlementService.OTHER_BUILDING_MESSAGE);

        assertThatThrownBy(() -> settlementService.findConfirmed(POD_ID, OTHER_BUILDING_USER_ID))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(settlementRepository, never()).findFirstByPodIdAndConfirmedTrueOrderByIdDesc(any());
    }

    @Test
    void 대표는_참여자_행이_없어도_결과를_볼_수_있다() {
        givenPodExists();
        given(settlementRepository.findFirstByPodIdAndConfirmedTrueOrderByIdDesc(POD_ID)).willReturn(Optional.empty());

        assertThat(settlementService.findConfirmed(POD_ID, HOST_USER_ID)).isNull();
        verify(podReader, never()).isParticipant(POD_ID, HOST_USER_ID);
    }

    @Test
    void 같은_동네라도_참여하지_않은_사람은_403이고_정산을_조회하지_않는다() {
        givenPodExists();
        given(podReader.isParticipant(POD_ID, BYSTANDER_USER_ID)).willReturn(false);

        assertThatThrownBy(() -> settlementService.findConfirmed(POD_ID, BYSTANDER_USER_ID))
                .isInstanceOf(com.ppuri.sobunsobun.settlement.domain.SettlementException.class)
                .hasMessage(SettlementService.NOT_MEMBER_MESSAGE)
                .satisfies(e -> assertThat(((com.ppuri.sobunsobun.settlement.domain.SettlementException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.FORBIDDEN));
        verify(settlementRepository, never()).findFirstByPodIdAndConfirmedTrueOrderByIdDesc(any());
    }
}
