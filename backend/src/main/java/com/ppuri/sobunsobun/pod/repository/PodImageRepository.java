package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.PodImage;
import org.springframework.data.jpa.repository.JpaRepository;

/** 팟 상품 사진. 키는 podId (팟당 1장). */
public interface PodImageRepository extends JpaRepository<PodImage, Long> {
}
