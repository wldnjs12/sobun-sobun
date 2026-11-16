package com.ppuri.sobunsobun.pod.dto;

/**
 * 건물 임팩트 리포트 (GET /api/pods/impact). 요청자 건물의 팟만 집계한다.
 *
 * 비율·평균 값은 계산할 표본이 없으면 null (화면에서 "–"로 표시).
 *
 * @param totalPods            지금까지 열린 팟 수(취소 포함)
 * @param openPods             모집 중
 * @param closedPods           마감(=성사) — 구매·정산 단계로 넘어간 팟
 * @param cancelledPods        모집 취소
 * @param successRate          성사율 = 마감 / (마감 + 취소). 0~1
 * @param neighborsJoined      취소되지 않은 팟의 참여 연인원(대표 포함)
 * @param unitsShared          성사된 팟에서 미개봉으로 나눈 총 개수 (1인 단위 × 참여 인원)
 * @param surplusUnitsAvoided  참여자가 각자 묶음을 통째로 샀다면 남았을 개수의 합 ((총 개수 − 1인 단위) × 참여 인원)
 * @param moneySaved           "혼자 살 때 가격"을 적은 성사 팟 기준, 1인 금액과의 차액 × 참여 인원 (원)
 * @param transactedAmount     성사된 팟의 거래액(총액 × (1+수고비율), 원)
 * @param avgFillMinutes       첫 참여(대표)부터 마지막 참여까지 걸린 평균 시간(분). 2명 이상 모인 팟만
 * @param paymentRate          성사된 팟 이웃(대표 제외) 중 [보냈어요]를 누른 비율. 0~1
 * @param pickupRate           성사된 팟 이웃(대표 제외) 중 [수령 완료]를 누른 비율. 0~1
 */
public record PodImpactResponse(
        int totalPods,
        int openPods,
        int closedPods,
        int cancelledPods,
        Double successRate,
        int neighborsJoined,
        long unitsShared,
        long surplusUnitsAvoided,
        long moneySaved,
        long transactedAmount,
        Double avgFillMinutes,
        Double paymentRate,
        Double pickupRate
) {
}
