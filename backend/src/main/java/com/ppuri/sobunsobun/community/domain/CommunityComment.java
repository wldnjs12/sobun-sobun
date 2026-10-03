package com.ppuri.sobunsobun.community.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 커뮤니티 댓글. ERD의 COMMUNITY_COMMENT. authorUserId는 응답에 절대 넣지 않는다. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long postId;
    private Long authorUserId;

    @Column(length = 500)
    private String content;

    private LocalDateTime createdAt;
    private int reportCount;
    private boolean hidden;

    @Builder
    public CommunityComment(Long postId, Long authorUserId, String content) {
        this.postId = postId;
        this.authorUserId = authorUserId;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isWrittenBy(Long userId) {
        return authorUserId.equals(userId);
    }

    /** 신고 수를 반영하고, 기준 이상이면 숨긴다. 한 번 숨겨지면 다시 보이지 않는다. */
    public void applyReportCount(int reportCount, int hideThreshold) {
        this.reportCount = reportCount;
        if (reportCount >= hideThreshold) {
            this.hidden = true;
        }
    }
}
