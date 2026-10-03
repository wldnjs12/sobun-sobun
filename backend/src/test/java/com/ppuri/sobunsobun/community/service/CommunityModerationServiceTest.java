package com.ppuri.sobunsobun.community.service;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityComment;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import com.ppuri.sobunsobun.community.domain.CommunityReport;
import com.ppuri.sobunsobun.community.domain.ReportTargetType;
import com.ppuri.sobunsobun.community.repository.CommunityCommentRepository;
import com.ppuri.sobunsobun.community.repository.CommunityReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static com.ppuri.sobunsobun.community.service.CommunityPostServiceTest.comment;
import static com.ppuri.sobunsobun.community.service.CommunityPostServiceTest.post;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommunityModerationServiceTest {

    private static final Long AUTHOR = 100L;

    @Mock
    private CommunityPostService postService;
    @Mock
    private CommunityCommentRepository commentRepository;
    @Mock
    private CommunityReportRepository reportRepository;

    private CommunityModerationService service;
    private CommunityPost post;

    @BeforeEach
    void setUp() {
        service = new CommunityModerationService(postService, commentRepository, reportRepository);
        post = post(1L, 1L, AUTHOR, CommunityCategory.FREE);
        when(postService.getVisiblePostOfMyBuilding(any(), any())).thenReturn(post);
    }

    private void givenReportCount(ReportTargetType type, Long targetId, long count) {
        when(reportRepository.countByTargetTypeAndTargetId(type, targetId)).thenReturn(count);
    }

    @Test
    void 신고가_기준_미만이면_숨기지_않는다() {
        givenReportCount(ReportTargetType.POST, 1L, CommunityModerationService.REPORT_HIDE_THRESHOLD - 1);

        service.reportPost(1L, 200L);

        assertThat(post.isHidden()).isFalse();
        assertThat(post.getReportCount()).isEqualTo(2);
        verify(reportRepository).saveAndFlush(any(CommunityReport.class));
    }

    @Test
    void 신고가_3회_쌓이면_글이_자동으로_숨겨진다() {
        givenReportCount(ReportTargetType.POST, 1L, CommunityModerationService.REPORT_HIDE_THRESHOLD);

        service.reportPost(1L, 200L);

        assertThat(post.isHidden()).isTrue();
    }

    @Test
    void 같은_사람이_두_번_신고하면_세지_않고_거절한다() {
        when(reportRepository.existsByTargetTypeAndTargetIdAndReporterUserId(ReportTargetType.POST, 1L, 200L)).thenReturn(true);

        assertThatThrownBy(() -> service.reportPost(1L, 200L))
                .isInstanceOf(IllegalStateException.class).hasMessage("이미 신고했어요.");
        verify(reportRepository, never()).saveAndFlush(any());
    }

    @Test
    void 거의_동시에_두_번_신고해_유니크_제약에_걸려도_중복으로_처리한다() {
        when(reportRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uk"));

        assertThatThrownBy(() -> service.reportPost(1L, 200L))
                .isInstanceOf(IllegalStateException.class).hasMessage("이미 신고했어요.");
    }

    @Test
    void 본인_글은_신고할_수_없다() {
        assertThatThrownBy(() -> service.reportPost(1L, AUTHOR)).isInstanceOf(IllegalStateException.class);
        verify(reportRepository, never()).saveAndFlush(any());
    }

    @Test
    void 댓글도_신고가_3회_쌓이면_숨겨진다() {
        CommunityComment comment = comment(10L, 1L, 300L);
        when(commentRepository.findById(10L)).thenReturn(Optional.of(comment));
        givenReportCount(ReportTargetType.COMMENT, 10L, 3);

        service.reportComment(10L, 200L);

        assertThat(comment.isHidden()).isTrue();
        verify(postService).getVisiblePostOfMyBuilding(1L, 200L); // 다른 건물 댓글 신고도 막힌다
    }

    @Test
    void 다른_건물_주민은_신고할_수_없다() {
        when(postService.getVisiblePostOfMyBuilding(1L, 900L)).thenThrow(new CommunityForbiddenException("우리 건물 커뮤니티만 볼 수 있어요."));

        assertThatThrownBy(() -> service.reportPost(1L, 900L)).isInstanceOf(CommunityForbiddenException.class);
        verify(reportRepository, never()).saveAndFlush(any());
    }
}
