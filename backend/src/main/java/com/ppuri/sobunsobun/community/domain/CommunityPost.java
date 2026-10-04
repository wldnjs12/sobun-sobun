package com.ppuri.sobunsobun.community.domain;

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

import java.time.LocalDateTime;

/**
 * 건물 커뮤니티 글. ERD의 COMMUNITY_POST.
 * authorUserId는 신고 처리용 내부 보관값이라 API 응답에 절대 넣지 않는다 (익명 닉네임은 응답 조립 시 계산).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long buildingId;
    private Long authorUserId;

    @Enumerated(EnumType.STRING)
    private CommunityCategory category;

    @Column(length = 2000)
    private String content;

    private LocalDateTime createdAt;
    private int reportCount;
    private boolean hidden;

    @Builder
    public CommunityPost(Long buildingId, Long authorUserId, CommunityCategory category, String content) {
        this.buildingId = buildingId;
        this.authorUserId = authorUserId;
        this.category = category;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isWrittenBy(Long userId) {
        return authorUserId.equals(userId);
    }

    /** "공구 제안" 글이면 프론트가 "이 품목으로 팟 열기" 버튼을 보여준다. */
    public boolean isSuggestable() {
        return category == CommunityCategory.GROUP_BUY_SUGGESTION;
    }

    /** 신고 수를 반영하고, 기준 이상이면 숨긴다. 한 번 숨겨지면 다시 보이지 않는다. */
    public void applyReportCount(int reportCount, int hideThreshold) {
        this.reportCount = reportCount;
        if (reportCount >= hideThreshold) {
            this.hidden = true;
        }
    }
}
