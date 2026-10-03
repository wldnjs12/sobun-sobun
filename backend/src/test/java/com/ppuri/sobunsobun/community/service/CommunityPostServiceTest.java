package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.auth.domain.User;
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

/** 건물 1 주민(100=글쓴이, 200, 300)과 건물 2 주민(900) 기준으로 검증한다. 건물 소속 확인은 ①의 공용 가드를 mock으로 대신한다. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommunityPostServiceTest {

    private static final Long MY_BUILDING = 1L;
    private static final Long OTHER_BUILDING = 2L;
    private static final Long AUTHOR = 100L;
    private static final Long OUTSIDER = 900L;

    @Mock
    private CommunityPostRepository postRepository;
    @Mock
    private CommunityCommentRepository commentRepository;
    @Mock
    private CommunityReportRepository reportRepository;
    @Mock
    private BuildingAccessService buildingAccessService;
    @Mock
    private UserRepository userRepository;

    private CommunityPostService service;

    @BeforeEach
    void setUp() {
        service = new CommunityPostService(postRepository, commentRepository, reportRepository, buildingAccessService, userRepository);
        // 900번만 다른 건물 주민 — 공용 가드가 403(BuildingAccessDeniedException)을 던진다
        doThrow(new BuildingAccessDeniedException("우리 건물 커뮤니티만 볼 수 있어요."))
                .when(buildingAccessService).requireMembership(eq(OUTSIDER), anyLong(), anyString());
        when(userRepository.findById(AUTHOR)).thenReturn(Optional.of(new User(AUTHOR, MY_BUILDING)));
        when(commentRepository.findByPostIdOrderByIdAsc(anyLong())).thenReturn(List.of());
    }

    static CommunityPost post(Long id, Long buildingId, Long authorUserId, CommunityCategory category) {
        CommunityPost post = CommunityPost.builder()
                .buildingId(buildingId).authorUserId(authorUserId).category(category).content("생수 2L 24병 같이 사실 분").build();
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
                new PostCreateRequest(CommunityCategory.GROUP_BUY_SUGGESTION, "  생수 같이 사실 분  "));

        ArgumentCaptor<CommunityPost> saved = ArgumentCaptor.forClass(CommunityPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().getBuildingId()).isEqualTo(MY_BUILDING);
        assertThat(saved.getValue().getContent()).isEqualTo("생수 같이 사실 분");
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
    void 다른_건물_주민은_글_목록을_볼_수_없다() {
        assertThatThrownBy(() -> service.list(MY_BUILDING, OUTSIDER, null))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(postRepository, never()).findByBuildingIdAndHiddenFalseOrderByIdDesc(anyLong());
    }

    @Test
    void 다른_건물_주민이_글_ID로_직접_접근하면_거절된다() {
        givenPost(post(1L, MY_BUILDING, AUTHOR, CommunityCategory.FREE));

        assertThatThrownBy(() -> service.getDetail(1L, OUTSIDER)).isInstanceOf(BuildingAccessDeniedException.class);
        assertThatThrownBy(() -> service.addComment(1L, OUTSIDER, new CommentCreateRequest("안녕하세요")))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void 목록은_카테고리로_거를_수_있고_댓글_수와_미리보기를_담는다() {
        CommunityPost share = post(2L, MY_BUILDING, AUTHOR, CommunityCategory.SHARE);
        when(postRepository.findByBuildingIdAndCategoryAndHiddenFalseOrderByIdDesc(MY_BUILDING, CommunityCategory.SHARE))
                .thenReturn(List.of(share));
        when(commentRepository.countByPostIdAndHiddenFalse(2L)).thenReturn(4L);

        List<CommunityPostSummary> list = service.list(MY_BUILDING, 200L, CommunityCategory.SHARE);

        assertThat(list).singleElement().satisfies(summary -> {
            assertThat(summary.commentCount()).isEqualTo(4L);
            assertThat(summary.content()).isEqualTo("생수 2L 24병 같이 사실 분"); // 프론트가 첫 줄을 제목처럼 씀
            assertThat(summary.preview()).isEqualTo("생수 2L 24병 같이 사실 분");
            assertThat(summary.mine()).isFalse();
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
