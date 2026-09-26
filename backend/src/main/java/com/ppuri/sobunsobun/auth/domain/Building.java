package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** QR+GPS로 인증된 건물(아파트/원룸 등) 단위. */
@Entity
@Getter
@NoArgsConstructor
public class Building {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Double latitude;
    private Double longitude;

    // TODO: 동적 QR 토큰 발급/만료 로직 추가 (BuildingQrToken 엔티티 분리 권장)
}
