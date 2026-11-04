package com.ppuri.sobunsobun.community.dto;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 글 상세(S17). 실제 작성자 ID는 절대 담지 않는다 — 닉네임("글쓴이"/"이웃 N")은 응답을 만들 때마다 계산한다.
 * suggestable=true(공구 제안)면 프론트가 "이 품목으로 팟 열기" 버튼을 보여준다.
 */
public record CommunityPostDetail(
        Long id,
        CommunityCategory category,
        String authorLabel,
        String content,
        boolean suggestable,
        boolean mine,
        LocalDateTime createdAt,
        List<CommunityCommentResponse> comments
) {
}
