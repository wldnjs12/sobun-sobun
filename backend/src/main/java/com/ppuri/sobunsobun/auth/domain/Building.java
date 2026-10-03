package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    /** 건물 1층 QR에 담긴 토큰. 토큰이 아직 없는 기존 건물 행이 있을 수 있어 nullable로 둔다. */
    @Column(unique = true)
    private String qrToken;

    /** QR 토큰 만료 시각. null이면 만료 없음(데모용 고정 QR). */
    private LocalDateTime qrTokenExpiresAt;

    public Building(String name, Double latitude, Double longitude) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Building(String name, Double latitude, Double longitude, String qrToken, LocalDateTime qrTokenExpiresAt) {
        this(name, latitude, longitude);
        this.qrToken = qrToken;
        this.qrTokenExpiresAt = qrTokenExpiresAt;
    }
}
