package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.PodCategory;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 팟 개설 요청. 수고비율을 비워두면 기본값(5%)이 적용된다.
 *
 * buildingId·hostUserId는 예전 프론트와의 호환을 위해 받기만 하고 **무시한다**.
 * 대표 = 요청 헤더 X-User-Id(로그인 토큰으로 서버가 덮어쓴 값), 건물 = 그 사용자의 등록 건물.
 * (본문 값을 믿으면 남의 이름·다른 건물로 팟을 열 수 있기 때문)
 */
public record PodCreateRequest(
        Long buildingId,
        Long hostUserId,
        @NotNull(message = "카테고리를 골라주세요.") PodCategory category,
        @NotBlank(message = "제품명을 입력해주세요.") @Size(max = 60, message = "제품명은 60자 이하로 적어주세요.") String title,
        @Size(max = 500, message = "설명은 500자 이하로 적어주세요.") String description,
        @NotNull(message = "총 결제 금액을 입력해주세요.") @Positive(message = "총 결제 금액은 0원보다 커야 해요.") BigDecimal totalAmount,
        @NotNull(message = "목표 인원을 입력해주세요.")
        @Min(value = 2, message = "목표 인원은 대표 포함 2명 이상이어야 해요.")
        @Max(value = 20, message = "목표 인원은 20명 이하로 정해주세요.") Integer targetParticipantCount,
        @NotNull(message = "총 개수를 입력해주세요.") @Positive(message = "총 개수는 1 이상이어야 해요.") Integer totalUnits,
        @NotBlank(message = "단위를 입력해주세요. (예: 롤, 팩, 개)") @Size(max = 10, message = "단위는 10자 이하로 적어주세요.") String unitLabel,
        @NotNull(message = "1인당 개수를 입력해주세요.") @Positive(message = "1인당 개수는 1 이상이어야 해요.") Integer unitsPerPerson,
        BigDecimal commissionRate,
        @NotNull(message = "마감 일시를 정해주세요.") @Future(message = "마감 일시는 지금보다 뒤여야 해요.") LocalDateTime deadline,
        @Size(max = 100, message = "픽업 안내는 100자 이하로 적어주세요.") String pickupNote,
        /** "혼자 샀을 때" 비교 가격. 선택값. */
        @Positive(message = "혼자 살 때 가격은 0원보다 커야 해요.") BigDecimal originalPrice
) {
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("0.05");

    public BigDecimal commissionRateOrDefault() {
        return commissionRate != null ? commissionRate : DEFAULT_COMMISSION_RATE;
    }
}
