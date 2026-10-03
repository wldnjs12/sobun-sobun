package com.ppuri.sobunsobun.community.repository;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    List<CommunityPost> findByBuildingIdAndHiddenFalseOrderByIdDesc(Long buildingId);

    List<CommunityPost> findByBuildingIdAndCategoryAndHiddenFalseOrderByIdDesc(Long buildingId, CommunityCategory category);
}
