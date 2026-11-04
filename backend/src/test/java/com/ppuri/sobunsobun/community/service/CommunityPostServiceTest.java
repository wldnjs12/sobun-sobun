package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
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
import com.ppuri.sobunsobun.community.repository.CommunityCommentRepository;
import com.ppuri.sobunsobun.community.repository.CommunityPostRepository;
import com.ppuri.sobunsobun.community.repository.CommunityReportRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 동네 범위 검증. 건물 1(100=글쓴이, 200, 300)과 반경 안의 건물 3(400)은 한 동네, 멀리 떨어진 건물 2(900)는 동네 밖.
 * 동네 판정은 ①의 공용 NeighborhoodService를 mock으로 대신한다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommunityPostServiceTest {

    private static final Long MY_BUILDING = 1L;
    private static final Long OTHER_BUILDING = 2L;   // 동네 밖
    private static final Long NEARBY_BUILDING = 3L;  // 같은 동네, 다른 건물
    private static final Long NEIGHBOR = 400L;       // 건물 3 주민
    private static final Long AUTHOR = 100L;
    private static final Long OUTSIDER = 900L;

    @Mock
    private CommunityPostRepository postRepository;
    @Mock
    private CommunityCommentRepository commentRepository;
    @Mock
    private CommunityReportRepository reportRepository;
    @Mock
    private NeighborhoodService neighborhoodService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingRepository buildingRepository;

    private CommunityPostService service;

    @BeforeEach
    void setUp() {
        service = new CommunityPostService(postRepository, commentRepository, reportRepository,
                neighborhoodService, userRepository, buildingRepository);
        // 900번만 동네 밖 주민 — 공용 가드가 403(BuildingAccessDeniedException)을 던진다
        doThrow(new BuildingAccessDeniedException(CommunityPostService.ACCESS_DENIED_MESSAGE))
                .when(neighborhoodService).requireNeighbor(eq(OUTSIDER), anyLong(), anyString());
        when(neighborhoodService.nearbyBuildingIds(anyLong())).thenReturn(List.of(MY_BUILDING, NEARBY_BUILDING));
        when(neighborhoodService.nearbyBuildingIds(OUTSIDER)).thenReturn(List.of(OTHER_BUILDING));
        when(neighborhoodService.findMyBuilding(anyLong())).thenReturn(Optional.of(building(MY_BUILDING, "인하로 100 (용현동)")));
        when(neighborhoodService.findMyBuilding(NEIGHBOR)).thenReturn(Optional.of(building(NEARBY_BUILDING, "인하로67번길 3 (용현동)")));
        when(neighborhoodService.distanceMeters(NEIGHBOR, MY_BUILDING)).thenReturn(320.0);
        when(buildingRepository.findById(MY_BUILDING)).thenReturn(Optional.of(building(MY_BUILDING, "인천광역시 미추홀구 인하로 100 (용현동)")));
        when(buildingRepository.findById(NEARBY_BUILDING)).thenReturn(Optional.of(building(NEARBY_BUILDING, "인천광역시 미추홀구 매소홀로 1 (학익동)")));
        when(userRepository.findById(AUTHOR)).thenReturn(Optional.of(new User(AUTHOR, MY_BUILDING)));
        when(commentRepository.findByPostIdOrderByIdAsc(anyLong())).thenReturn(List.of());
    }

    static Building building(Long id, String roadAddress) {
        Building building = new Building("제니스빌", roadAddress, "BD" + id, null, "BD" + id, 37.45, 126.65);
        ReflectionTestUtils.setField(building, "id", id);
        return building;
    }

    static CommunityPost post(Long id, Long buildingId, Long authorUserId, CommunityCategory category) {
        CommunityPost post = CommunityPost.builder()
                .buildingId(buildingId).authorUserId(authorUserId).category(category).content("휴지 30롤 같이 사실 분").build();
        ReflectionTestUtils.setField(post, "id", id);
        return post;
    }

    static CommunityComment comment(Long id, Long postId, Long authorUserId) {
        CommunityComment comment = CommunityComment.builder().postId(postId).authorUserId(authorUserId).content("저요!").build();
        ReflectionTestUtils.setField(comment, "id", id);
        return comment;
    }

    private void givenPost(CommunityPost post) {
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
    }

    @Test
    void 글은_작성자의_소속_건물에_저장되고_상세가_돌아온다() {
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(inv -> inv.getArgument(0));

        CommunityPostDetail detail = service.create(AUTHOR,
                new PostCreateRequest(CommunityCategory.GROUP_BUY_SUGGESTION, "  휴지 30롤 같이 사실 분  "));

        ArgumentCaptor<CommunityPost> saved = ArgumentCaptor.forClass(CommunityPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().getBuildingId()).isEqualTo(MY_BUILDING);
        assertThat(saved.getValue().getContent()).isEqualTo("휴지 30롤 같이 사실 분");
        assertThat(detail.authorLabel()).isEqualTo("글쓴이");
        assertThat(detail.suggestable()).isTrue();
        assertThat(detail.mine()).isTrue();
    }

    @Test
    void 건물을_등록하지_않은_사람은_글을_쓸_수_없다() {
        when(userRepository.findById(555L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(555L, new PostCreateRequest(CommunityCategory.FREE, "안녕하세요")))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(postRepository, never()).save(any());
    }

    @Test
    void 공구_제안이_아닌_글은_팟_열기_대상이_아니다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));

        assertThat(service.getDetail(1L, 200L).suggestable()).isFalse();
    }

    @Test
    void 상세에서_댓글은_익명_닉네임으로_표시되고_숨김_댓글은_빠진다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.QUESTION));
        CommunityComment hidden = comment(11L, 1L, 300L);
        hidden.applyReportCount(3, 3);
        when(commentRepository.findByPostIdOrderByIdAsc(1L)).thenReturn(List.of(
                comment(10L, 1L, 200L), hidden, comment(12L, 1L, AUTHOR), comment(13L, 1L, 400L), comment(14L, 1L, 200L)));

        CommunityPostDetail detail = service.getDetail(1L, 200L);

        assertThat(detail.comments()).extracting(CommunityCommentResponse::authorLabel)
                .containsExactly("이웃 1", "글쓴이", "이웃 3", "이웃 1"); // 숨김 댓글 작성자(300)가 "이웃 2"를 차지해 번호가 유지된다
        assertThat(detail.comments()).extracting(CommunityCommentResponse::mine)
                .containsExactly(true, false, false, true);
        assertThat(detail.mine()).isFalse();
    }

    @Test
    void 목록은_내_동네_건물들의_글만_조회한다() {
        when(postRepository.findByBuildingIdInAndHiddenFalseOrderByIdDesc(List.of(MY_BUILDING, NEARBY_BUILDING)))
                .thenReturn(List.of(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE)));

        assertThat(service.list(200L, null)).hasSize(1);
        verify(postRepository).findByBuildingIdInAndHiddenFalseOrderByIdDesc(List.of(MY_BUILDING, NEARBY_BUILDING));
    }

    @Test
    void 동네_밖_건물의_글은_목록에_나오지_않는다() {
        // 900번의 동네에는 건물 2만 있다 → 건물 1 글을 조회할 방법 자체가 없다
        when(postRepository.findByBuildingIdInAndHiddenFalseOrderByIdDesc(List.of(OTHER_BUILDING))).thenReturn(List.of());

        assertThat(service.list(OUTSIDER, null)).isEmpty();
        verify(postRepository, never()).findByBuildingIdInAndHiddenFalseOrderByIdDesc(List.of(MY_BUILDING, NEARBY_BUILDING));
    }

    @Test
    void 건물을_등록하지_않은_사람은_목록을_볼_수_없다() {
        when(neighborhoodService.nearbyBuildingIds(555L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.list(555L, null)).isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 같은_동네_다른_건물_이웃도_글을_보고_댓글을_달_수_있다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.GROUP_BUY_SUGGESTION));
        when(commentRepository.save(any(CommunityComment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommunityPostDetail detail = service.addComment(1L, NEIGHBOR, new CommentCreateRequest("저도 10롤 필요해요"));

        verify(neighborhoodService).requireNeighbor(NEIGHBOR, MY_BUILDING, CommunityPostService.ACCESS_DENIED_MESSAGE);
        verify(commentRepository).save(any(CommunityComment.class));
        assertThat(detail.mine()).isFalse();
    }

    @Test
    void 글에는_건물명_대신_법정동과_대략_거리만_붙는다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));

        CommunityPostDetail fromNeighbor = service.getDetail(1L, NEIGHBOR);
        assertThat(fromNeighbor.neighborhoodName()).isEqualTo("용현동");
        assertThat(fromNeighbor.distanceLabel()).isEqualTo("약 300m");

        CommunityPostDetail fromSameBuilding = service.getDetail(1L, 200L);
        assertThat(fromSameBuilding.distanceLabel()).isEqualTo("같은 건물");
        // 응답 어디에도 건물명이 들어가지 않는다
        assertThat(fromSameBuilding.toString()).doesNotContain("제니스빌").doesNotContain("인하로");
    }

    @Test
    void 동네_밖_주민이_글_ID로_직접_접근하면_거절된다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));

        assertThatThrownBy(() -> service.getDetail(1L, OUTSIDER)).isInstanceOf(BuildingAccessDeniedException.class);
        assertThatThrownBy(() -> service.addComment(1L, OUTSIDER, new CommentCreateRequest("안녕하세요")))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void 목록은_카테고리로_거를_수_있고_댓글_수와_미리보기를_담는다() {
        CommunityPost share = post(2L, MY_BUILDING, AUTHOR, CommunityCategory.SHARE);
        CommunityPost nearbyShare = post(3L, NEARBY_BUILDING, NEIGHBOR, CommunityCategory.SHARE);
        when(postRepository.findByBuildingIdInAndCategoryAndHiddenFalseOrderByIdDesc(
                List.of(MY_BUILDING, NEARBY_BUILDING), CommunityCategory.SHARE))
                .thenReturn(List.of(share, nearbyShare));
        when(commentRepository.countByPostIdAndHiddenFalse(2L)).thenReturn(4L);
        when(neighborhoodService.distanceMeters(200L, NEARBY_BUILDING)).thenReturn(640.0);

        List<CommunityPostSummary> list = service.list(200L, CommunityCategory.SHARE);

        assertThat(list).hasSize(2);
        assertThat(list.get(1).neighborhoodName()).isEqualTo("학익동");
        assertThat(list.get(1).distanceLabel()).isEqualTo("약 600m");
        assertThat(list).first().satisfies(summary -> {
            assertThat(summary.commentCount()).isEqualTo(4L);
            assertThat(summary.content()).isEqualTo("휴지 30롤 같이 사실 분"); // 프론트가 첫 줄을 제목처럼 씀
            assertThat(summary.preview()).isEqualTo("휴지 30롤 같이 사실 분");
            assertThat(summary.mine()).isFalse();
            assertThat(summary.neighborhoodName()).isEqualTo("용현동");
            assertThat(summary.distanceLabel()).isEqualTo("같은 건물");
        });
    }

    @Test
    void 숨김_처리된_글은_없는_글로_취급한다() {
        CommunityPost hidden = post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE);
        hidden.applyReportCount(3, 3);
        givenPost(hidden);

        assertThatThrownBy(() -> service.getDetail(1L, 200L)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 남의_글은_삭제할_수_없다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));

        assertThatThrownBy(() -> service.delete(1L, 200L)).isInstanceOf(CommunityForbiddenException.class);
        verify(postRepository, never()).delete(any());
    }

    @Test
    void 본인_글을_지우면_댓글과_신고_기록도_같이_지운다() {
        CommunityPost post = post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE);
        givenPost(post);
        when(commentRepository.findByPostIdOrderByIdAsc(1L)).thenReturn(List.of(comment(10L, 1L, 200L), comment(11L, 1L, 300L)));

        service.delete(1L, AUTHOR);

        verify(reportRepository).deleteByTargetTypeAndTargetIdIn(ReportTargetType.COMMENT, List.of(10L, 11L));
        verify(reportRepository).deleteByTargetTypeAndTargetIdIn(ReportTargetType.POST, List.of(1L));
        verify(commentRepository).deleteByPostId(1L);
        verify(postRepository).delete(post);
    }

    @Test
    void 남의_댓글은_삭제할_수_없고_본인_댓글은_삭제된다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));
        CommunityComment mine = comment(10L, 1L, 200L);
        when(commentRepository.findById(10L)).thenReturn(Optional.of(mine));

        assertThatThrownBy(() -> service.deleteComment(10L, 300L)).isInstanceOf(CommunityForbiddenException.class);

        service.deleteComment(10L, 200L);
        verify(commentRepository).delete(mine);
    }
}
