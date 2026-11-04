package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodCategory;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 팟 수정 요청 (PATCH). 보낸 값만 바꾸고, 빠진(null) 값은 그대로 둔다.
 * 그래서 @NotNull은 없고, 값이 왔을 때의 형식만 검사한다.
 * description·pickupNote를 지우려면 빈 문자열("")을 보낸다.
 */
public record PodUpdateRequest(
        @Size(min = 1, max = 60, message = "제품명은 1~60자로 적어주세요.") String title,
        @Size(max = 500, message = "설명은 500자 이하로 적어주세요.") String description,
        PodCategory category,
        @Positive(message = "총 결제 금액은 0원보다 커야 해요.") BigDecimal totalAmount,
        @Positive(message = "총 개수는 1 이상이어야 해요.") Integer totalUnits,
        @Size(min = 1, max = 10, message = "단위는 1~10자로 적어주세요.") String unitLabel,
        @Positive(message = "1인당 개수는 1 이상이어야 해요.") Integer unitsPerPerson,
        @Min(value = 2, message = "목표 인원은 대표 포함 2명 이상이어야 해요.")
        @Max(value = 20, message = "목표 인원은 20명 이하로 정해주세요.") Integer targetParticipantCount,
        @Future(message = "마감 일시는 지금보다 뒤여야 해요.") LocalDateTime deadline,
        @Size(max = 100, message = "픽업 안내는 100자 이하로 적어주세요.") String pickupNote,
        @Positive(message = "혼자 살 때 가격은 0원보다 커야 해요.") BigDecimal originalPrice
) {
    public Pod.PodUpdate toChange() {
        return new Pod.PodUpdate(title, description, category, totalAmount, totalUnits, unitLabel, unitsPerPerson,
                targetParticipantCount, deadline, pickupNote, originalPrice);
    }
}
