package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityComment;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import com.ppuri.sobunsobun.community.domain.ReportTargetType;
import com.ppuri.sobunsobun.community.dto.CommentCreateRequest;
import com.ppuri.sobunsobun.community.dto.CommunityCommentResponse;
import com.ppuri.sobunsobun.community.dto.CommunityPostDetail;
import com.ppuri.sobunsobun.community.dto.CommunityPostSummary;
import com.ppuri.sobunsobun.community.dto.PostCreateRequest;
import com.ppuri.sobunsobun.community.repository.CommunityCommentRepository;
import com.ppuri.sobunsobun.community.repository.CommunityPostRepository;
import com.ppuri.sobunsobun.community.repository.CommunityReportRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 핵심 기능 ⑤: 건물별 익명 커뮤니티 — 글/댓글 (신고는 CommunityModerationService).
 * 모든 동작은 "요청한 사람의 건물 == 글의 건물"일 때만 허용한다 (아니면 403 BUILDING_ACCESS_DENIED — ①의 공용 가드 사용).
 * 숨김 처리된 글은 목록/상세/댓글/신고 모두에서 없는 글로 취급한다.
 */
@Service
@RequiredArgsConstructor
public class CommunityPostService {

    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityReportRepository reportRepository;
    private static final String ACCESS_DENIED_MESSAGE = "우리 건물 커뮤니티만 볼 수 있어요.";

    private final BuildingAccessService buildingAccessService;
    private final UserRepository userRepository;

    /** 글 목록(S16) — 최신순, 숨김 글 제외. category가 null이면 전체. */
    @Transactional(readOnly = true)
    public List<CommunityPostSummary> list(Long buildingId, Long userId, CommunityCategory category) {
        checkMember(buildingId, userId);
        List<CommunityPost> posts = category == null
                ? postRepository.findByBuildingIdAndHiddenFalseOrderByIdDesc(buildingId)
                : postRepository.findByBuildingIdAndCategoryAndHiddenFalseOrderByIdDesc(buildingId, category);
        return posts.stream()
                .map(post -> CommunityPostSummary.of(post, commentRepository.countByPostIdAndHiddenFalse(post.getId()), userId))
                .toList();
    }

    /** 건물은 요청으로 받지 않고 작성자의 소속 건물로 정한다 — 다른 건물에 글을 쓸 방법 자체가 없다. */
    @Transactional
    public CommunityPostDetail create(Long userId, PostCreateRequest request) {
        Long buildingId = userRepository.findById(userId)
                .orElseThrow(() -> new BuildingAccessDeniedException("건물을 먼저 등록해야 커뮤니티를 이용할 수 있어요."))
                .getBuildingId();
        CommunityPost post = postRepository.save(CommunityPost.builder()
                .buildingId(buildingId)
                .authorUserId(userId)
                .category(request.category())
                .content(request.content().trim())
                .build());
        return toDetail(post, userId);
    }

    @Transactional(readOnly = true)
    public CommunityPostDetail getDetail(Long postId, Long userId) {
        return toDetail(getVisiblePostOfMyBuilding(postId, userId), userId);
    }

    /** 본인 글만 삭제. 댓글과 관련 신고 기록도 같이 지운다. */
    @Transactional
    public void delete(Long postId, Long userId) {
        CommunityPost post = getVisiblePostOfMyBuilding(postId, userId);
        if (!post.isWrittenBy(userId)) {
            throw new CommunityForbiddenException("본인이 쓴 글만 삭제할 수 있어요.");
        }
        List<Long> commentIds = commentRepository.findByPostIdOrderByIdAsc(postId).stream()
                .map(CommunityComment::getId)
                .toList();
        if (!commentIds.isEmpty()) {
            reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.COMMENT, commentIds);
        }
        reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.POST, List.of(postId));
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    @Transactional
    public CommunityPostDetail addComment(Long postId, Long userId, CommentCreateRequest request) {
        CommunityPost post = getVisiblePostOfMyBuilding(postId, userId);
        commentRepository.save(CommunityComment.builder()
                .postId(postId)
                .authorUserId(userId)
                .content(request.content().trim())
                .build());
        return toDetail(post, userId);
    }

    /** 본인 댓글만 삭제. */
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        CommunityComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다: " + commentId));
        getVisiblePostOfMyBuilding(comment.getPostId(), userId);
        if (!comment.isWrittenBy(userId)) {
            throw new CommunityForbiddenException("본인이 쓴 댓글만 삭제할 수 있어요.");
        }
        reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.COMMENT, List.of(commentId));
        commentRepository.delete(comment);
    }

    /** 숨김이 아닌 글을 찾고, 요청한 사람이 그 글의 건물 주민인지 확인한다. 신고 처리에서도 쓴다. */
    CommunityPost getVisiblePostOfMyBuilding(Long postId, Long userId) {
        CommunityPost post = postRepository.findById(postId)
                .filter(p -> !p.isHidden())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다: " + postId));
        checkMember(post.getBuildingId(), userId);
        return post;
    }

    private void checkMember(Long buildingId, Long userId) {
        buildingAccessService.requireMembership(userId, buildingId, ACCESS_DENIED_MESSAGE);
    }

    /** 익명 닉네임은 저장하지 않고 여기서 매번 계산한다. 응답에는 실제 작성자 ID를 넣지 않는다. */
    private CommunityPostDetail toDetail(CommunityPost post, Long viewerUserId) {
        List<CommunityComment> allComments = commentRepository.findByPostIdOrderByIdAsc(post.getId());
        AnonymousNicknames nicknames = new AnonymousNicknames(
                post.getAuthorUserId(),
                allComments.stream().map(CommunityComment::getAuthorUserId).toList());

        List<CommunityCommentResponse> comments = allComments.stream()
                .filter(comment -> !comment.isHidden())
                .map(comment -> new CommunityCommentResponse(
                        comment.getId(),
                        nicknames.labelOf(comment.getAuthorUserId()),
                        comment.getContent(),
                        comment.isWrittenBy(viewerUserId),
                        comment.getCreatedAt()))
                .toList();

        return new CommunityPostDetail(
                post.getId(),
                post.getCategory(),
                AnonymousNicknames.AUTHOR_LABEL,
                post.getContent(),
                post.isSuggestable(),
                post.isWrittenBy(viewerUserId),
                post.getCreatedAt(),
                comments);
    }
}
