package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.util.StringUtils;

/** 주소+GPS로 인증된 건물(아파트/원룸 등) 단위. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Building {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String roadAddress;

    /** 도로명주소 API의 건물관리번호(bdMgtSn). */
    private String buildingManagementNumber;

    /** 아파트만 값이 있다. */
    private String dong;

    /** 빌라/원룸은 건물관리번호만, 아파트는 건물관리번호+동까지 같아야 같은 건물로 취급한다. */
    @Column(unique = true, nullable = false)
    private String buildingKey;

    private Double latitude;
    private Double longitude;

    public Building(String name, String roadAddress, String buildingManagementNumber,
                     String dong, String buildingKey, Double latitude, Double longitude) {
        this.name = name;
        this.roadAddress = roadAddress;
        this.buildingManagementNumber = buildingManagementNumber;
        this.dong = dong;
        this.buildingKey = buildingKey;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /** 빌라/원룸: bdMgtSn만. 아파트(동이 있음): bdMgtSn + ":" + 동. */
    public static String buildKey(String buildingManagementNumber, String dong) {
        return StringUtils.hasText(dong) ? buildingManagementNumber + ":" + dong : buildingManagementNumber;
    }
}
