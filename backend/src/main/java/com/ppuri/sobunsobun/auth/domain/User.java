package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 로그인이 없어 클라이언트가 보낸 X-User-Id를 그대로 식별자로 쓴다 (Pod의 hostUserId 등과 동일한 관례).
 * 그래서 id는 @GeneratedValue가 아니라 클라이언트 값을 그대로 받는다 — 그래야 재등록 시 같은 사용자를 찾을 수 있다.
 *
 * 테이블명은 "user"가 아니라 "users"다 — PostgreSQL에서 user는 예약어라 그대로 쓰면 DDL이 깨진다
 * (로컬 H2/기본 설정에서는 안 걸리고 Postgres에서만 터지는 함정이라 실제 Postgres로 기동 테스트해서 발견함).
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    private Long id;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    /**
     * 상세주소(호수·층 등, 예: "302호"). 선택값이라 nullable.
     * 왜 Building이 아니라 User에 두나: 같은 건물 이웃끼리도 서로의 호수를 알면 안 되기 때문 (개인정보).
     * 본인 정보 응답(건물 등록 결과, /me) 외에는 절대 내려보내지 않는다.
     */
    @Column(name = "detail_address", length = 50)
    private String detailAddress;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public User(Long id, Long buildingId) {
        this(id, buildingId, null);
    }

    public User(Long id, Long buildingId, String detailAddress) {
        this.id = id;
        this.buildingId = buildingId;
        this.detailAddress = detailAddress;
        this.createdAt = LocalDateTime.now();
    }

    /** 건물을 재등록(이사 등)하면 소속과 상세주소를 함께 갱신한다. 상세주소를 비우면 null로 지운다. */
    public void changeBuilding(Long buildingId, String detailAddress) {
        this.buildingId = buildingId;
        this.detailAddress = detailAddress;
    }

    /** 예전 호출부 호환용. 이사하면 예전 호수는 의미가 없으니 상세주소도 지운다. */
    public void changeBuilding(Long buildingId) {
        changeBuilding(buildingId, null);
    }
}
