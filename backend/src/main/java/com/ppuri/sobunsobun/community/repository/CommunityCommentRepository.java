package com.ppuri.sobunsobun.community.repository;

import com.ppuri.sobunsobun.community.domain.CommunityComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {

    /** 익명 번호는 숨김 댓글까지 포함한 등장 순서로 매겨야 번호가 흔들리지 않는다. */
    List<CommunityComment> findByPostIdOrderByIdAsc(Long postId);

    long countByPostIdAndHiddenFalse(Long postId);

    void deleteByPostId(Long postId);
}
