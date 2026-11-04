package com.ppuri.sobunsobun.community.domain;

/**
 * 커뮤니티 카테고리. DB에는 enum 이름(FREE 등)이 문자열로 저장돼 있어서, 이름은 바꾸지 말고 표시 문구만 프론트에서 바꾼다.
 * 다루는 품목은 생활용품(휴지·세제·샴푸·주방/욕실용품 등)뿐이다 — 식품·식재료는 취급하지 않는다 (2026-11 기획 개편).
 */
public enum CommunityCategory {
    FREE,                 // 자유 — 동네 생활 이야기
    QUESTION,             // 질문 — 예) "근처에서 세제 리필 되는 곳 있나요?"
    SHARE,                // 나눔 — 예) "남은 지퍼백 1박스 나눔해요", 나눔 후기
    GROUP_BUY_SUGGESTION  // 공구 제안 — 예) "휴지 30롤 같이 사실 분" → 상세 화면에 "이 품목으로 팟 열기" 버튼
}
