package com.ppuri.sobunsobun.settlement.service;

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
import static org.mockito.BDDMockito.given;

/** 확정된 정산 결과 조회 단위 테스트 */
@ExtendWith(MockitoExtension.class)
class SettlementFindTest {

    private static final long POD_ID = 1L;

    @Mock
    private PodParticipantCountReader participantCountReader;

    @Mock
    private SettlementRepository settlementRepository;

    private SettlementService settlementService;

    @BeforeEach
    void setUp() {
        settlementService = new SettlementService(new StubReceiptOcrClient(), participantCountReader, settlementRepository);
    }

    @Test
    void 확정된_정산이_있으면_결과를_돌려준다() {
        Settlement settlement = new Settlement(POD_ID, new BigDecimal("12300"), new BigDecimal("0.05"),
                new BigDecimal("12915"), 3, new BigDecimal("4305"));
        given(settlementRepository.findFirstByPodIdAndConfirmedTrueOrderByIdDesc(POD_ID)).willReturn(Optional.of(settlement));

        SettlementResponse result = settlementService.findConfirmed(POD_ID);

        assertThat(result.podId()).isEqualTo(POD_ID);
        assertThat(result.finalAmount()).isEqualByComparingTo("12915");
        assertThat(result.participantCount()).isEqualTo(3);
        assertThat(result.perPersonAmount()).isEqualByComparingTo("4305");
        assertThat(result.confirmed()).isTrue();
    }

    @Test
    void 아직_확정_전이면_null() {
        given(settlementRepository.findFirstByPodIdAndConfirmedTrueOrderByIdDesc(POD_ID)).willReturn(Optional.empty());

        assertThat(settlementService.findConfirmed(POD_ID)).isNull();
    }
}
