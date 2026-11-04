package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.service.NeighborhoodService;
import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityComment;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import com.ppuri.sobunsobun.community.domain.ReportTargetType;
import com.ppuri.sobunsobun.community.dto.CommentCreateRequest;
import com.ppuri.sobunsobun.community.dto.CommunityCommentResponse;
import com.ppuri.sobunsobun.community.dto.CommunityPostDetail;
import com.ppuri.sobunsobun.community.dto.CommunityPostSummary;
import com.ppuri.sobunsobun.community.dto.PostCreateRequest;
import com.ppuri.sobunsobun.community.dto.PostLocation;
import com.ppuri.sobunsobun.community.repository.CommunityCommentRepository;
import com.ppuri.sobunsobun.community.repository.CommunityPostRepository;
import com.ppuri.sobunsobun.community.repository.CommunityReportRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 핵심 기능 ⑤: 동네 익명 커뮤니티 — 글/댓글 (신고는 CommunityModerationService).
 * 2026-11 개편: 같은 건물 → 동네(내 건물 반경 1km). 글은 여전히 "작성자의 건물"에 저장하고,
 * 읽는 쪽에서 "그 건물이 내 동네 안인가"를 NeighborhoodService로 판정한다 (아니면 403 BUILDING_ACCESS_DENIED).
 * 다른 사람에게는 글쓴이 건물 대신 법정동 이름 + 대략 거리만 보여준다.
 * 숨김 처리된 글은 목록/상세/댓글/신고 모두에서 없는 글로 취급한다.
 */
@Service
@RequiredArgsConstructor
public class CommunityPostService {

    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityReportRepository reportRepository;
    static final String ACCESS_DENIED_MESSAGE = "우리 동네(반경 1km) 이웃의 글만 볼 수 있어요.";
    static final String NO_BUILDING_MESSAGE = "건물을 먼저 등록해야 커뮤니티를 이용할 수 있어요.";

    private final NeighborhoodService neighborhoodService;
    private final UserRepository userRepository;
    private final BuildingRepository buildingRepository;

    /**
     * 글 목록(S16) — 내 동네(반경 1km) 안 건물들의 글, 최신순, 숨김 글 제외. category가 null이면 전체.
     * 건물을 아직 등록하지 않았으면 "동네"가 없으므로 403으로 막는다 (빈 목록을 주면 등록 안 한 걸 모르고 헤맨다).
     */
    @Transactional(readOnly = true)
    public List<CommunityPostSummary> list(Long userId, CommunityCategory category) {
        List<Long> nearby = neighborhoodService.nearbyBuildingIds(userId);
        if (nearby.isEmpty()) {
            throw new BuildingAccessDeniedException(NO_BUILDING_MESSAGE);
        }
        List<CommunityPost> posts = category == null
                ? postRepository.findByBuildingIdInAndHiddenFalseOrderByIdDesc(nearby)
                : postRepository.findByBuildingIdInAndCategoryAndHiddenFalseOrderByIdDesc(nearby, category);
        LocationLabeler labeler = new LocationLabeler(userId);
        return posts.stream()
                .map(post -> CommunityPostSummary.of(post, commentRepository.countByPostIdAndHiddenFalse(post.getId()),
                        userId, labeler.of(post.getBuildingId())))
                .toList();
    }

    /** 건물은 요청으로 받지 않고 작성자의 소속 건물로 정한다 — 다른 건물에 글을 쓸 방법 자체가 없다. */
    @Transactional
    public CommunityPostDetail create(Long userId, PostCreateRequest request) {
        Long buildingId = userRepository.findById(userId)
                .orElseThrow(() -> new BuildingAccessDeniedException(NO_BUILDING_MESSAGE))
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
        return toDetail(getVisiblePostInMyNeighborhood(postId, userId), userId);
    }

    /** 본인 글만 삭제. 댓글과 관련 신고 기록도 같이 지운다. */
    @Transactional
    public void delete(Long postId, Long userId) {
        CommunityPost post = getVisiblePostInMyNeighborhood(postId, userId);
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
        CommunityPost post = getVisiblePostInMyNeighborhood(postId, userId);
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
        getVisiblePostInMyNeighborhood(comment.getPostId(), userId);
        if (!comment.isWrittenBy(userId)) {
            throw new CommunityForbiddenException("본인이 쓴 댓글만 삭제할 수 있어요.");
        }
        reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.COMMENT, List.of(commentId));
        commentRepository.delete(comment);
    }

    /** 숨김이 아닌 글을 찾고, 그 글의 건물이 요청한 사람의 동네(반경 1km) 안인지 확인한다. 신고 처리에서도 쓴다. */
    CommunityPost getVisiblePostInMyNeighborhood(Long postId, Long userId) {
        CommunityPost post = postRepository.findById(postId)
                .filter(p -> !p.isHidden())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다: " + postId));
        neighborhoodService.requireNeighbor(userId, post.getBuildingId(), ACCESS_DENIED_MESSAGE);
        return post;
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

        PostLocation location = new LocationLabeler(viewerUserId).of(post.getBuildingId());
        return new CommunityPostDetail(
                post.getId(),
                post.getCategory(),
                AnonymousNicknames.AUTHOR_LABEL,
                post.getContent(),
                post.isSuggestable(),
                post.isWrittenBy(viewerUserId),
                post.getCreatedAt(),
                location.neighborhoodName(),
                location.distanceLabel(),
                comments);
    }

    /**
     * 글쓴이 건물 → "용현동 · 약 300m" 같은 대략 위치로 바꾼다.
     * 목록에는 같은 건물 글이 여러 개라서, 건물마다 한 번만 계산하도록 요청 단위로 기억해 둔다.
     */
    private class LocationLabeler {
        private final Long viewerUserId;
        private final Long myBuildingId;
        private final Map<Long, PostLocation> cache = new HashMap<>();

        LocationLabeler(Long viewerUserId) {
            this.viewerUserId = viewerUserId;
            this.myBuildingId = neighborhoodService.findMyBuilding(viewerUserId).map(Building::getId).orElse(null);
        }

        PostLocation of(Long postBuildingId) {
            if (postBuildingId == null) return PostLocation.UNKNOWN;
            return cache.computeIfAbsent(postBuildingId, id -> {
                Optional<Building> building = buildingRepository.findById(id);
                String name = building.map(Building::getRoadAddress).map(NeighborhoodService::neighborhoodName).orElse(null);
                boolean sameBuilding = id.equals(myBuildingId);
                Double meters = sameBuilding ? null : neighborhoodService.distanceMeters(viewerUserId, id);
                return new PostLocation(name, NeighborhoodService.roughDistanceLabel(meters, sameBuilding));
            });
        }
    }
}
