package com.ppuri.sobunsobun.community.dto;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 글 작성 요청. 건물은 요청으로 받지 않고 작성자의 소속 건물로 정한다 (다른 건물에 글 쓰기 방지). */
public record PostCreateRequest(
        @NotNull CommunityCategory category,
        @NotBlank @Size(max = 2000) String content
) {
}
