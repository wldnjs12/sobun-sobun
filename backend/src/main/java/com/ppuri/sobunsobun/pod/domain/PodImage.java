package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대표가 올린 팟 상품 사진 (팟당 1장). 사진 바이트를 DB에 그대로 둔다.
 *
 * 왜 DB인가: Railway 서버의 파일은 재배포 때마다 지워지고, 외부 스토리지(S3 등)는 키·설정이 더 필요하다.
 * 프론트가 올리기 전에 800px JPEG로 줄여서 보내므로 장당 수백 KB 이하라 해커톤 규모에서는 DB로 충분하다.
 * Pod 테이블과 나눈 이유: 목록 조회 때마다 사진 바이트까지 읽지 않으려고 (Pod에는 imageVersion만 있다).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PodImage {

    /** 팟 id를 그대로 키로 쓴다 — 팟당 사진 1장이라 따로 id를 만들 필요가 없다. */
    @Id
    private Long podId;

    /** image/jpeg, image/png, image/webp 중 하나 (파일 앞부분 시그니처로 판별한 값) */
    @Column(length = 20, nullable = false)
    private String contentType;

    @Column(nullable = false)
    private byte[] data;

    private LocalDateTime uploadedAt;

    public PodImage(Long podId, String contentType, byte[] data, LocalDateTime uploadedAt) {
        this.podId = podId;
        this.contentType = contentType;
        this.data = data;
        this.uploadedAt = uploadedAt;
    }

    /** 사진 교체. 행을 지우고 새로 넣는 대신 같은 행의 값만 바꾼다. */
    public void replace(String contentType, byte[] data, LocalDateTime uploadedAt) {
        this.contentType = contentType;
        this.data = data;
        this.uploadedAt = uploadedAt;
    }
}
