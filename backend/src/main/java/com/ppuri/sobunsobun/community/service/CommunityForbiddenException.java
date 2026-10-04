package com.ppuri.sobunsobun.community.service;

/**
 * 남의 글/댓글을 지우려 할 때. 컨트롤러에서 403으로 바꾼다.
 * 다른 건물 접근은 이게 아니라 BuildingAccessDeniedException(403 + code BUILDING_ACCESS_DENIED) — 프론트가 code로
 * "다른 건물" 안내 화면을 띄우므로, 건물 문제가 아닌 경우와 섞이지 않게 나눠 둔다.
 */
public class CommunityForbiddenException extends RuntimeException {

    public CommunityForbiddenException(String message) {
        super(message);
    }
}
