package com.ppuri.sobunsobun.community.dto;

import java.time.LocalDateTime;

/** 댓글 한 개. authorLabel은 "글쓴이" 또는 "이웃 N" — 실제 사용자 ID는 담지 않는다. */
public record CommunityCommentResponse(
        Long id,
        String authorLabel,
        String content,
        boolean mine,
        LocalDateTime createdAt
) {
}
