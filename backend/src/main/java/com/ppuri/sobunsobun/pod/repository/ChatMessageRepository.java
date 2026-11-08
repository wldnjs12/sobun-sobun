package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 팟 채팅 전체, 보낸 순서(id 오름차순) */
    List<ChatMessage> findByPodIdOrderByIdAsc(Long podId);
}
