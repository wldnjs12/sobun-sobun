package com.ppuri.sobunsobun.community.repository;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.domain.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    /** 동네(반경 1km) 안 건물들의 글 — buildingIds는 NeighborhoodService.nearbyBuildingIds 결과 */
    List<CommunityPost> findByBuildingIdInAndHiddenFalseOrderByIdDesc(Collection<Long> buildingIds);

    List<CommunityPost> findByBuildingIdInAndCategoryAndHiddenFalseOrderByIdDesc(Collection<Long> buildingIds,
                                                                                 CommunityCategory category);
}
