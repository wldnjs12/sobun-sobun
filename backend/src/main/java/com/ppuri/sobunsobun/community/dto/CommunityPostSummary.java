package com.ppuri.sobunsobun.community.dto;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityPost;

import java.time.LocalDateTime;

/**
 * 글 목록(S16) 카드 한 장. 작성자 정보는 넣지 않는다 (목록에서는 누가 썼는지 알 필요 없음).
 * mine: 요청한 사람이 쓴 글인지 — 본인에게만 의미 있는 값이라 익명성을 해치지 않는다.
 */
public record CommunityPostSummary(
        Long id,
        CommunityCategory category,
        String preview,
        long commentCount,
        boolean suggestable,
        boolean mine,
        LocalDateTime createdAt
) {
    private static final int PREVIEW_LENGTH = 60;

    public static CommunityPostSummary of(CommunityPost post, long commentCount, Long viewerUserId) {
        return new CommunityPostSummary(
                post.getId(),
                post.getCategory(),
                preview(post.getContent()),
                commentCount,
                post.isSuggestable(),
                post.isWrittenBy(viewerUserId),
                post.getCreatedAt());
    }

    private static String preview(String content) {
        String oneLine = content.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= PREVIEW_LENGTH ? oneLine : oneLine.substring(0, PREVIEW_LENGTH) + "…";
    }
}
