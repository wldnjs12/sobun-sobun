package com.ppuri.sobunsobun.community.service;

/** 다른 건물 글에 접근하거나, 남의 글/댓글을 지우려 할 때. 컨트롤러에서 403으로 바꾼다. */
public class CommunityForbiddenException extends RuntimeException {

    public CommunityForbiddenException(String message) {
        super(message);
    }
}
