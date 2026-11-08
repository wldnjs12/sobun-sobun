package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 팟 참여자 채팅 메시지 1건. 채팅방은 팟마다 1개라 따로 "방" 테이블 없이 podId로 묶는다.
 *
 * 닉네임은 저장하지 않는다 — 팟에서는 닉네임 대신 "대표 / 이웃 N"으로만 보여주기 때문 (PRODUCT_SPEC D24).
 * "이웃 N" 번호는 저장하지 않고 조회할 때 메시지 순서로 계산한다 (PodChatService.labelsOf).
 */
@Entity
@Table(name = "chat_message", indexes = @Index(name = "idx_chat_message_pod_id", columnList = "podId, id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    public static final int MAX_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long podId;

    @Column(nullable = false)
    private Long senderId;

    @Column(nullable = false, length = MAX_LENGTH)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public ChatMessage(Long podId, Long senderId, String content, LocalDateTime createdAt) {
        this.podId = podId;
        this.senderId = senderId;
        this.content = content;
        this.createdAt = createdAt;
    }
}
