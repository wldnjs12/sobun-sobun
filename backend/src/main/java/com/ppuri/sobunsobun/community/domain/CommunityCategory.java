package com.ppuri.sobunsobun.community.domain;

/**
 * 커뮤니티 카테고리. 임시 목록이라 enum으로 분리해 둔다 — 확정은 docs/open-decisions.md.
 */
public enum CommunityCategory {
    FREE,                 // 자유
    QUESTION,             // 질문
    SHARE,                // 나눔
    GROUP_BUY_SUGGESTION  // 공구 제안 — 상세 화면에 "이 품목으로 팟 열기" 버튼
}
