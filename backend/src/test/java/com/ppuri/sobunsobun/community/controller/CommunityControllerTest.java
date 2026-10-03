package com.ppuri.sobunsobun.community.controller;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.dto.CommunityCommentResponse;
import com.ppuri.sobunsobun.community.dto.CommunityPostDetail;
import com.ppuri.sobunsobun.community.service.CommunityForbiddenException;
import com.ppuri.sobunsobun.community.service.CommunityModerationService;
import com.ppuri.sobunsobun.community.service.CommunityPostService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** DB 없이 웹 계층만 띄워서 응답 형식과 상태 코드를 확인한다. */
@WebMvcTest(CommunityController.class)
class CommunityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CommunityPostService postService;
    @MockBean
    private CommunityModerationService moderationService;

    @Test
    void 글_상세_응답에는_실제_작성자_ID가_없고_익명_닉네임만_있다() throws Exception {
        given(postService.getDetail(1L, 200L)).willReturn(new CommunityPostDetail(
                1L, CommunityCategory.GROUP_BUY_SUGGESTION, "글쓴이", "생수 같이 사실 분", true, false, LocalDateTime.now(),
                List.of(new CommunityCommentResponse(10L, "이웃 1", "저요!", true, LocalDateTime.now()))));

        mockMvc.perform(get("/api/community/posts/1").param("userId", "200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorLabel").value("글쓴이"))
                .andExpect(jsonPath("$.data.suggestable").value(true))
                .andExpect(jsonPath("$.data.comments[0].authorLabel").value("이웃 1"))
                .andExpect(content().string(not(containsString("authorUserId"))))
                .andExpect(content().string(not(containsString("userId"))));
    }

    @Test
    void 다른_건물_접근은_403과_안내_문구를_돌려준다() throws Exception {
        given(postService.getDetail(1L, 900L)).willThrow(new CommunityForbiddenException("우리 건물 커뮤니티만 볼 수 있어요."));

        mockMvc.perform(get("/api/community/posts/1").param("userId", "900"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("우리 건물 커뮤니티만 볼 수 있어요."));
    }

    @Test
    void 중복_신고는_409로_돌려준다() throws Exception {
        org.mockito.BDDMockito.willThrow(new IllegalStateException("이미 신고했어요."))
                .given(moderationService).reportPost(1L, 200L);

        mockMvc.perform(post("/api/community/posts/1/report").param("userId", "200"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("이미 신고했어요."));
    }

    @Test
    void 내용이_비어있으면_400을_돌려준다() throws Exception {
        mockMvc.perform(post("/api/community/posts").param("userId", "100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"FREE\",\"content\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void 없는_카테고리면_400을_돌려준다() throws Exception {
        mockMvc.perform(post("/api/community/posts").param("userId", "100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"NOTICE\",\"content\":\"안녕하세요\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/community/posts").param("buildingId", "1").param("userId", "100").param("category", "NOTICE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 글_작성은_userId와_본문을_서비스로_넘긴다() throws Exception {
        given(postService.create(eq(100L), any())).willReturn(new CommunityPostDetail(
                5L, CommunityCategory.FREE, "글쓴이", "안녕하세요", false, true, LocalDateTime.now(), List.of()));

        mockMvc.perform(post("/api/community/posts").param("userId", "100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"FREE\",\"content\":\"안녕하세요\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(5))
                .andExpect(jsonPath("$.data.mine").value(true));
    }
}
