package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 하나의 공동구매 팟. 참여자 수·총액·수고비율이 바뀔 때마다 1인당 금액을 다시 계산한다.
 *
 * 인원 규칙: participantCount와 targetParticipantCount에는 **대표 본인도 포함**된다
 * (대표는 개설과 동시에 자동 참여 → 개설 직후 participantCount = 1).
 *
 * 2026-11 기획 개편으로 추가된 컬럼(category, totalUnits 등)은 DB에서 전부 nullable이다.
 * ddl-auto: update가 이미 데이터가 있는 테이블에 NOT NULL 컬럼을 추가하면 실패하기 때문.
 * 그래서 옛 데이터(값이 null)는 getter에서 기본값으로 바꿔 읽는다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Pod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long buildingId;
    private Long hostUserId;
    private String title;
    private BigDecimal totalAmount;
    private Integer targetParticipantCount;
    private Integer participantCount;
    private BigDecimal commissionRate;
    private LocalDateTime deadline;

    /**
     * 정산(settlement)이 JPQL로 이 컬럼을 직접 읽는다 (JpqlSettlementPodReader) — 이름 바꾸지 말 것.
     * status가 CLOSED일 때만 true. 취소(CANCELLED)는 false로 둬서 정산이 시작되지 않게 한다.
     */
    private Boolean closed;

    /** "혼자 샀을 때" 비교 가격. 없으면(null) 정산 결과 화면에서 절약액 카드를 보여주지 않는다. */
    private BigDecimal originalPrice;

    /** 비대면 픽업 수령용 4자리 PIN. 생성 시 자동 발급, 이후 변경 없음. */
    private String pickupPin;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PodCategory category;

    /** 제품 설명·구매처 (선택) */
    @Column(length = 500)
    private String description;

    /** 묶음 전체 개수 (예: 휴지 30롤 → 30) */
    private Integer totalUnits;

    /** 개수 단위 (예: "롤", "팩") */
    @Column(length = 10)
    private String unitLabel;

    /** 한 사람이 받는 미개봉 개수 (예: 10) */
    private Integer unitsPerPerson;

    /** 대략적인 픽업 장소 (예: "1층 공동현관 앞"). 상세 주소는 넣지 않도록 화면에서 안내한다. */
    @Column(length = 100)
    private String pickupNote;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PodStatus status;

    /**
     * 대표가 올린 상품 사진의 버전. null이면 사진 없음 → 프론트가 예시 사진이나 카테고리 아이콘을 보여준다.
     * 사진 바이트는 PodImage(pod_image 테이블)에 따로 둔다 — 목록을 불러올 때마다 사진까지 읽지 않으려고.
     * 사진을 바꿀 때마다 1씩 올라가서, 프론트가 캐시해 둔 옛 사진 대신 새 사진을 받아오게 한다.
     */
    private Integer imageVersion;

    @Builder
    public Pod(Long buildingId, Long hostUserId, String title, BigDecimal totalAmount,
               Integer targetParticipantCount, BigDecimal commissionRate, LocalDateTime deadline,
               BigDecimal originalPrice, PodCategory category, String description, Integer totalUnits,
               String unitLabel, Integer unitsPerPerson, String pickupNote) {
        this.buildingId = buildingId;
        this.hostUserId = hostUserId;
        this.title = title;
        this.totalAmount = totalAmount;
        this.targetParticipantCount = targetParticipantCount;
        this.participantCount = 0;
        this.commissionRate = commissionRate;
        this.deadline = deadline;
        this.closed = false;
        this.status = PodStatus.OPEN;
        this.originalPrice = originalPrice;
        this.category = category != null ? category : PodCategory.ETC;
        this.description = description;
        this.totalUnits = totalUnits;
        this.unitLabel = unitLabel;
        this.unitsPerPerson = unitsPerPerson;
        this.pickupNote = pickupNote;
        this.pickupPin = String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    /** 옛 데이터는 category가 null이라 "기타"로 본다. (Lombok은 같은 이름 getter가 있으면 자동 생성을 건너뜀) */
    public PodCategory getCategory() {
        return category != null ? category : PodCategory.ETC;
    }

    /** 옛 데이터는 status가 null이라 closed 값으로 추정한다. */
    public PodStatus getStatus() {
        if (status != null) return status;
        return Boolean.TRUE.equals(closed) ? PodStatus.CLOSED : PodStatus.OPEN;
    }

    public boolean isHost(Long userId) {
        return hostUserId != null && hostUserId.equals(userId);
    }

    public boolean isDeadlinePassed(LocalDateTime now) {
        return deadline != null && now.isAfter(deadline);
    }

    /** 1인당 개수 × 목표 인원(대표 포함) ≤ 총 개수 — 묶음을 미개봉 단위로 나눌 수 있는지 확인한다. */
    public static void validateUnits(Integer totalUnits, Integer unitsPerPerson, Integer targetParticipantCount, String unitLabel) {
        if (totalUnits == null || unitsPerPerson == null || targetParticipantCount == null) return;
        long needed = (long) unitsPerPerson * targetParticipantCount;
        if (needed > totalUnits) {
            String unit = unitLabel == null ? "개" : unitLabel;
            throw new PodRuleViolationException(String.format(
                    "1인당 %d%s × %d명 = %d%s이라 총 %d%s보다 많아요. 1인당 개수나 목표 인원을 줄여주세요.",
                    unitsPerPerson, unit, targetParticipantCount, needed, unit, totalUnits, unit));
        }
    }

    /** 참여 (대표의 자동 참여 포함). 마감 시간 확인은 join(now)에서 한다. */
    public void join() {
        requireNotCancelled("모집이 취소된 공동구매예요.");
        if (Boolean.TRUE.equals(closed)) {
            throw new IllegalStateException("이미 마감된 팟에는 참여할 수 없습니다.");
        }
        if (participantCount >= targetParticipantCount) {
            throw new IllegalStateException("목표 인원이 이미 가득 찼습니다.");
        }
        participantCount++;
    }

    /** 이웃의 참여. 마감 시간이 지났으면 거절한다. */
    public void join(LocalDateTime now) {
        if (getStatus() == PodStatus.OPEN && isDeadlinePassed(now)) {
            throw new IllegalStateException("모집 마감 시간이 지나서 참여할 수 없어요.");
        }
        join();
    }

    public void cancelJoin() {
        requireNotCancelled("모집이 취소된 공동구매예요.");
        if (Boolean.TRUE.equals(closed)) {
            throw new IllegalStateException("이미 마감된 팟은 참여를 취소할 수 없습니다.");
        }
        if (participantCount <= 0) {
            throw new IllegalStateException("참여자가 없어 취소할 수 없습니다.");
        }
        participantCount--;
    }

    public void close(Long requesterId) {
        if (!isHost(requesterId)) {
            throw new PodForbiddenException("대표만 팟을 마감할 수 있습니다.");
        }
        requireNotCancelled("모집이 취소된 공동구매는 마감할 수 없어요.");
        if (Boolean.TRUE.equals(closed)) {
            throw new IllegalStateException("이미 마감된 팟입니다.");
        }
        if (participantCount <= 0) {
            throw new IllegalStateException("참여자가 없는 팟은 마감할 수 없습니다.");
        }
        closed = true;
        status = PodStatus.CLOSED;
    }

    /** 대표의 모집 취소. 마감(CLOSED) 전이면 참여자가 있어도 취소할 수 있다. */
    public void cancel(Long requesterId) {
        if (!isHost(requesterId)) {
            throw new PodForbiddenException("대표만 모집을 취소할 수 있어요.");
        }
        requireNotCancelled("이미 취소된 공동구매예요.");
        if (Boolean.TRUE.equals(closed)) {
            throw new IllegalStateException("이미 마감된 공동구매는 취소할 수 없어요. 정산을 진행해 주세요.");
        }
        status = PodStatus.CANCELLED;
    }

    /** 대표의 상품 사진 등록·교체. 글 수정과 같은 조건 — 이웃이 보고 참여한 사진이 나중에 바뀌면 안 되므로. */
    public void changeImage(Long requesterId, boolean hasOtherParticipants) {
        requireEditable(requesterId, hasOtherParticipants);
        imageVersion = imageVersion == null ? 1 : imageVersion + 1;
    }

    /** 대표의 상품 사진 삭제. 조건은 changeImage와 같다. */
    public void removeImage(Long requesterId, boolean hasOtherParticipants) {
        requireEditable(requesterId, hasOtherParticipants);
        imageVersion = null;
    }

    /** 글·사진을 고칠 수 있는 조건: 대표 + 모집중 + 대표 외 참여자 없음 (PRODUCT_SPEC D10) */
    private void requireEditable(Long requesterId, boolean hasOtherParticipants) {
        if (!isHost(requesterId)) {
            throw new PodForbiddenException("대표만 글을 수정할 수 있어요.");
        }
        if (getStatus() != PodStatus.OPEN) {
            throw new IllegalStateException("모집중인 공동구매만 수정할 수 있어요.");
        }
        if (hasOtherParticipants) {
            throw new IllegalStateException("이미 참여한 이웃이 있어서 수정할 수 없어요.");
        }
    }

    /**
     * 대표의 글 수정. 모집중이고 대표 외 참여자가 없을 때만 가능하다
     * (이미 참여한 이웃은 바뀌기 전 조건을 보고 들어왔기 때문). null인 값은 바꾸지 않는다.
     */
    public void update(Long requesterId, boolean hasOtherParticipants, PodUpdate change) {
        requireEditable(requesterId, hasOtherParticipants);
        int newTarget = change.targetParticipantCount() != null ? change.targetParticipantCount() : targetParticipantCount;
        if (newTarget < Math.max(participantCount, 1)) {
            throw new PodRuleViolationException("목표 인원은 현재 참여 인원보다 적을 수 없어요.");
        }
        Integer newTotalUnits = change.totalUnits() != null ? change.totalUnits() : totalUnits;
        Integer newUnitsPerPerson = change.unitsPerPerson() != null ? change.unitsPerPerson() : unitsPerPerson;
        String newUnitLabel = change.unitLabel() != null ? change.unitLabel() : unitLabel;
        validateUnits(newTotalUnits, newUnitsPerPerson, newTarget, newUnitLabel);

        if (change.title() != null) title = change.title();
        if (change.description() != null) description = change.description().isBlank() ? null : change.description();
        if (change.category() != null) category = change.category();
        if (change.totalAmount() != null) totalAmount = change.totalAmount();
        if (change.deadline() != null) deadline = change.deadline();
        if (change.pickupNote() != null) pickupNote = change.pickupNote().isBlank() ? null : change.pickupNote();
        if (change.originalPrice() != null) originalPrice = change.originalPrice();
        targetParticipantCount = newTarget;
        totalUnits = newTotalUnits;
        unitsPerPerson = newUnitsPerPerson;
        unitLabel = newUnitLabel;
    }

    /** 수정 가능한 값 묶음. 서비스가 요청 DTO를 이 값으로 바꿔 넘긴다(도메인이 DTO 패키지를 모르게). */
    public record PodUpdate(String title, String description, PodCategory category, BigDecimal totalAmount,
                            Integer totalUnits, String unitLabel, Integer unitsPerPerson,
                            Integer targetParticipantCount, LocalDateTime deadline, String pickupNote,
                            BigDecimal originalPrice) {
    }

    /** 1인당 금액 = 총액 x (1 + 수고비율) / 참여자 수 (원 단위 올림). */
    public BigDecimal calculatePerPersonAmount() {
        int divisor = Math.max(participantCount, 1);
        return totalAmount
                .multiply(BigDecimal.ONE.add(commissionRate))
                .divide(BigDecimal.valueOf(divisor), 0, RoundingMode.CEILING);
    }

    private void requireNotCancelled(String message) {
        if (getStatus() == PodStatus.CANCELLED) {
            throw new IllegalStateException(message);
        }
    }
}
