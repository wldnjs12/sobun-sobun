package com.ppuri.sobunsobun.settlement.service;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.settlement.domain.Settlement;
import com.ppuri.sobunsobun.settlement.domain.SettlementException;
import com.ppuri.sobunsobun.settlement.domain.SettlementRepository;
import com.ppuri.sobunsobun.settlement.dto.SettlementConfirmRequest;
import com.ppuri.sobunsobun.settlement.dto.SettlementResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** 정산 확정(계산 + 입력 검증 + 건물 소속·대표·마감 검사) 단위 테스트 */
@ExtendWith(MockitoExtension.class)
class SettlementConfirmTest {

    private static final long POD_ID = 1L;
    private static final long BUILDING_ID = 10L;
    private static final long HOST_USER_ID = 1L;
    private static final long NEIGHBOR_USER_ID = 2L;     // 같은 건물, 대표 아님
    private static final long OTHER_BUILDING_USER_ID = 99L;

    @Mock
    private SettlementPodReader podReader;

    @Mock
    private SettlementRepository settlementRepository;

    @Mock
    private BuildingAccessService buildingAccessService;

    private SettlementService settlementService;

    @BeforeEach
    void setUp() {
        settlementService = new SettlementService(new StubReceiptOcrClient(), podReader, settlementRepository,
                buildingAccessService);
        lenient().when(settlementRepository.save(any(Settlement.class))).then(returnsFirstArg());
    }

    /** 대표가 확정할 수 있는 상태의 팟 (마감됨) */
    private static PodSummary closedPod(int participants) {
        return new PodSummary(POD_ID, BUILDING_ID, HOST_USER_ID, participants, true);
    }

    private static SettlementConfirmRequest request() {
        return new SettlementConfirmRequest(new BigDecimal("12300"), new BigDecimal("0.05"));
    }

    private SettlementResponse confirm(String cost, String rate, int participants) {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(participants)));
        return settlementService.confirm(POD_ID, HOST_USER_ID,
                new SettlementConfirmRequest(new BigDecimal(cost), new BigDecimal(rate)));
    }

    private void assertRejected(SettlementConfirmRequest request, String message) {
        assertRejected(HOST_USER_ID, request, HttpStatus.BAD_REQUEST, message);
    }

    private void assertRejected(long userId, SettlementConfirmRequest request, HttpStatus status, String message) {
        assertThatThrownBy(() -> settlementService.confirm(POD_ID, userId, request))
                .isInstanceOfSatisfying(SettlementException.class, e -> assertThat(e.getStatus()).isEqualTo(status))
                .hasMessage(message);
        verify(settlementRepository, never()).save(any());
    }

    @Test
    void 일반_케이스_12300원_수고비_5퍼센트_3명() {
        SettlementResponse result = confirm("12300", "0.05", 3);

        assertThat(result.finalAmount()).isEqualByComparingTo("12915");
        assertThat(result.perPersonAmount()).isEqualByComparingTo("4305");
        assertThat(result.participantCount()).isEqualTo(3);
        assertThat(result.confirmed()).isTrue();
    }

    @Test
    void 같은_건물_대표가_마감된_팟을_확정하면_건물_소속을_정산용_문구로_확인한다() {
        confirm("12300", "0.05", 3);

        verify(buildingAccessService).requireMembership(HOST_USER_ID, BUILDING_ID, SettlementService.OTHER_BUILDING_MESSAGE);
    }

    @Test
    void 확정_결과가_저장된다() {
        confirm("12300", "0.05", 3);

        ArgumentCaptor<Settlement> saved = ArgumentCaptor.forClass(Settlement.class);
        verify(settlementRepository).save(saved.capture());
        assertThat(saved.getValue().getPodId()).isEqualTo(POD_ID);
        assertThat(saved.getValue().getRecognizedCost()).isEqualByComparingTo("12300");
        assertThat(saved.getValue().getCommissionRate()).isEqualByComparingTo("0.05");
        assertThat(saved.getValue().getConfirmed()).isTrue();
        assertThat(saved.getValue().getReceiptImageUrl()).isNull(); // 원본 이미지는 저장하지 않음 (MVP)
    }

    @Test
    void 수고비율_0퍼센트면_원가를_그대로_나눈다() {
        SettlementResponse result = confirm("12300", "0", 3);

        assertThat(result.finalAmount()).isEqualByComparingTo("12300");
        assertThat(result.perPersonAmount()).isEqualByComparingTo("4100");
    }

    @Test
    void 참여자_1명이면_최종_금액_전부를_낸다() {
        SettlementResponse result = confirm("12300", "0.05", 1);

        assertThat(result.finalAmount()).isEqualByComparingTo("12915");
        assertThat(result.perPersonAmount()).isEqualByComparingTo("12915");
    }

    @ParameterizedTest(name = "{0}원 × (1+{1}) ÷ {2}명 → 최종 {3}, 1인당 {4}")
    @CsvSource({
            "10000, 0.10, 3, 11000, 3667",   // 3666.67 → 올림
            "12345, 0.05, 4, 12962, 3241",   // 최종 12962.25 → 반올림 12962, 1인당 3240.56 → 올림
            "10001, 0,    2, 10001, 5001",   // 5000.5 → 올림
    })
    void 나누어떨어지지_않는_금액은_1인당_원_단위_올림(String cost, String rate, int participants,
                                         String expectedFinal, String expectedPerPerson) {
        SettlementResponse result = confirm(cost, rate, participants);

        assertThat(result.finalAmount()).isEqualByComparingTo(expectedFinal);
        assertThat(result.perPersonAmount()).isEqualByComparingTo(expectedPerPerson);
        // 올림이라 대표가 받는 총액은 최종 금액보다 적지 않다
        assertThat(result.perPersonAmount().multiply(BigDecimal.valueOf(participants)))
                .isGreaterThanOrEqualTo(new BigDecimal(expectedFinal));
    }

    @Test
    void 원가가_0원이하거나_없으면_거절() {
        String message = "영수증 금액은 0원보다 커야 해요.";
        assertRejected(new SettlementConfirmRequest(BigDecimal.ZERO, new BigDecimal("0.05")), message);
        assertRejected(new SettlementConfirmRequest(new BigDecimal("-100"), new BigDecimal("0.05")), message);
        assertRejected(new SettlementConfirmRequest(null, new BigDecimal("0.05")), message);
        assertRejected(null, message);
    }

    @Test
    void 원가에_소수점이_있으면_거절() {
        assertRejected(new SettlementConfirmRequest(new BigDecimal("12300.5"), new BigDecimal("0.05")),
                "영수증 금액은 원 단위 정수로 입력해주세요.");
    }

    @Test
    void 수고비율이_범위_밖이거나_없으면_거절() {
        String message = "수고비율은 0%에서 100% 사이여야 해요.";
        assertRejected(new SettlementConfirmRequest(new BigDecimal("12300"), new BigDecimal("-0.01")), message);
        assertRejected(new SettlementConfirmRequest(new BigDecimal("12300"), new BigDecimal("1.01")), message);
        assertRejected(new SettlementConfirmRequest(new BigDecimal("12300"), null), message);
    }

    @Test
    void 수고비율이_1퍼센트_단위가_아니면_거절() {
        assertRejected(new SettlementConfirmRequest(new BigDecimal("12300"), new BigDecimal("0.055")),
                "수고비율은 1% 단위로 입력해주세요.");
    }

    @Test
    void 없는_팟이면_404() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.empty());

        assertRejected(HOST_USER_ID, request(), HttpStatus.NOT_FOUND, "팟을 찾을 수 없어요.");
    }

    @Test
    void 다른_건물_사용자면_403이고_저장되지_않는다() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(3)));
        willThrow(new BuildingAccessDeniedException(SettlementService.OTHER_BUILDING_MESSAGE))
                .given(buildingAccessService)
                .requireMembership(OTHER_BUILDING_USER_ID, BUILDING_ID, SettlementService.OTHER_BUILDING_MESSAGE);

        assertThatThrownBy(() -> settlementService.confirm(POD_ID, OTHER_BUILDING_USER_ID, request()))
                .isInstanceOf(BuildingAccessDeniedException.class)
                .hasMessage("다른 건물의 정산에는 접근할 수 없어요.");
        verify(settlementRepository, never()).save(any());
    }

    @Test
    void 건물_가드가_중복_확정_검사보다_먼저_실행된다() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(3)));
        willThrow(new BuildingAccessDeniedException(SettlementService.OTHER_BUILDING_MESSAGE))
                .given(buildingAccessService).requireMembership(anyLong(), anyLong(), any());

        assertThatThrownBy(() -> settlementService.confirm(POD_ID, OTHER_BUILDING_USER_ID, request()))
                .isInstanceOf(BuildingAccessDeniedException.class);
        // 다른 건물 사람에게 "이미 확정됨" 여부를 알려주지 않도록 정산 존재 여부를 아예 조회하지 않는다
        verify(settlementRepository, never()).existsByPodIdAndConfirmedTrue(any());
    }

    @Test
    void 같은_건물이어도_대표가_아니면_403이고_저장되지_않는다() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(3)));

        assertRejected(NEIGHBOR_USER_ID, request(), HttpStatus.FORBIDDEN, "대표만 정산을 확정할 수 있습니다.");
    }

    @Test
    void 마감_전_팟이면_400() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(new PodSummary(POD_ID, BUILDING_ID, HOST_USER_ID, 3, false)));

        assertRejected(HOST_USER_ID, request(), HttpStatus.BAD_REQUEST, "마감된 팟만 정산을 확정할 수 있어요.");
    }

    @Test
    void 참여자가_0명이면_거절() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(0)));

        assertRejected(request(), "참여자가 없는 팟은 정산할 수 없어요.");
    }

    @Test
    void 이미_확정된_팟이면_거절() {
        given(podReader.findPod(POD_ID)).willReturn(Optional.of(closedPod(3)));
        given(settlementRepository.existsByPodIdAndConfirmedTrue(POD_ID)).willReturn(true);

        assertRejected(request(), "이미 정산이 확정된 팟이에요.");
    }
}
