package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.community.domain.CommunityComment;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import com.ppuri.sobunsobun.community.domain.CommunityReport;
import com.ppuri.sobunsobun.community.domain.ReportTargetType;
import com.ppuri.sobunsobun.community.repository.CommunityCommentRepository;
import com.ppuri.sobunsobun.community.repository.CommunityReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 커뮤니티 신고. 신고가 기준 이상 쌓이면 글/댓글을 자동으로 숨긴다.
 * 같은 사람의 중복 신고는 세지 않는다 (CommunityReport 유니크 제약 + 사전 확인).
 * 신고 수는 신고 테이블에서 다시 세서 반영한다 — 동시에 신고가 들어와도 숫자가 어긋나지 않게.
 */
@Service
@RequiredArgsConstructor
public class CommunityModerationService {

    /** 자동 숨김 기준 — 임시값, 확정은 docs/open-decisions.md. */
    public static final int REPORT_HIDE_THRESHOLD = 3;

    private final CommunityPostService postService;
    private final CommunityCommentRepository commentRepository;
    private final CommunityReportRepository reportRepository;

    @Transactional
    public void reportPost(Long postId, Long reporterUserId) {
        CommunityPost post = postService.getVisiblePostOfMyBuilding(postId, reporterUserId);
        if (post.isWrittenBy(reporterUserId)) {
            throw new IllegalStateException("본인 글은 신고할 수 없어요.");
        }
        long reportCount = saveReport(ReportTargetType.POST, postId, reporterUserId);
        post.applyReportCount((int) reportCount, REPORT_HIDE_THRESHOLD);
    }

    @Transactional
    public void reportComment(Long commentId, Long reporterUserId) {
        CommunityComment comment = commentRepository.findById(commentId)
                .filter(c -> !c.isHidden())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다: " + commentId));
        postService.getVisiblePostOfMyBuilding(comment.getPostId(), reporterUserId);
        if (comment.isWrittenBy(reporterUserId)) {
            throw new IllegalStateException("본인 댓글은 신고할 수 없어요.");
        }
        long reportCount = saveReport(ReportTargetType.COMMENT, commentId, reporterUserId);
        comment.applyReportCount((int) reportCount, REPORT_HIDE_THRESHOLD);
    }

    /** 신고를 저장하고, 그 대상의 총 신고 수를 돌려준다. */
    private long saveReport(ReportTargetType targetType, Long targetId, Long reporterUserId) {
        if (reportRepository.existsByTargetTypeAndTargetIdAndReporterUserId(targetType, targetId, reporterUserId)) {
            throw new IllegalStateException("이미 신고했어요.");
        }
        try {
            reportRepository.saveAndFlush(CommunityReport.builder()
                    .targetType(targetType)
                    .targetId(targetId)
                    .reporterUserId(reporterUserId)
                    .build());
        } catch (DataIntegrityViolationException e) {
            // 같은 사람이 거의 동시에 두 번 누른 경우 — 사전 확인을 통과해도 유니크 제약에서 걸린다.
            throw new IllegalStateException("이미 신고했어요.");
        }
        return reportRepository.countByTargetTypeAndTargetId(targetType, targetId);
    }
}
