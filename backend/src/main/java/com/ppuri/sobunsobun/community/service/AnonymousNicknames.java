package com.ppuri.sobunsobun.community.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 글 하나 안에서의 익명 닉네임 규칙.
 * - 글 작성자는 항상 "글쓴이"
 * - 그 외 작성자는 댓글에 처음 등장한 순서대로 "이웃 1", "이웃 2"... (같은 사람은 같은 글 안에서 항상 같은 번호)
 * 닉네임은 DB에 저장하지 않고 응답을 만들 때마다 계산한다.
 */
public class AnonymousNicknames {

    public static final String AUTHOR_LABEL = "글쓴이";
    private static final String NEIGHBOR_LABEL_PREFIX = "이웃 ";

    private final Long postAuthorUserId;
    private final Map<Long, Integer> neighborNumbers = new HashMap<>();

    /**
     * @param commentAuthorUserIdsInOrder 그 글의 댓글 작성자 ID를 작성 순서대로 (숨김 댓글 포함 — 번호가 흔들리지 않게)
     */
    public AnonymousNicknames(Long postAuthorUserId, List<Long> commentAuthorUserIdsInOrder) {
        this.postAuthorUserId = postAuthorUserId;
        for (Long userId : commentAuthorUserIdsInOrder) {
            if (!userId.equals(postAuthorUserId)) {
                neighborNumbers.putIfAbsent(userId, neighborNumbers.size() + 1);
            }
        }
    }

    public String labelOf(Long userId) {
        if (userId.equals(postAuthorUserId)) {
            return AUTHOR_LABEL;
        }
        Integer number = neighborNumbers.get(userId);
        if (number == null) {
            throw new IllegalArgumentException("이 글에 등장하지 않은 작성자입니다.");
        }
        return NEIGHBOR_LABEL_PREFIX + number;
    }
}
