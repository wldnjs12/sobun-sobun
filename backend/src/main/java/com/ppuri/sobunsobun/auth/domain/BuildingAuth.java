package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자-건물 인증 기록 (ERD의 BUILDING_AUTH).
 * 같은 사용자가 같은 건물에 다시 인증하면 새 행을 만들지 않고 verifiedAt만 갱신한다.
 * USER 엔티티가 아직 없어서 buildingId/userId는 FK 연관관계 없이 id 값만 저장한다 (Pod.buildingId와 같은 방식).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"building_id", "user_id"}))
public class BuildingAuth {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDateTime verifiedAt;

    public BuildingAuth(Long buildingId, Long userId, LocalDateTime verifiedAt) {
        this.buildingId = buildingId;
        this.userId = userId;
        this.verifiedAt = verifiedAt;
    }

    public void reverify(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}
