package com.ppuri.sobunsobun;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class SobunsobunApplication {

    /**
     * 서비스 기준 시간대. 서버 시각은 전부 LocalDateTime(시간대 없음)으로 저장·응답하고,
     * 프론트도 팟 마감시간을 한국 시각으로 보내고 받은 시각을 한국 시각으로 읽는다.
     * 배포 컨테이너(Railway, eclipse-temurin)는 기본이 UTC라서, 그대로 두면 서버가 만드는 시각
     * (커뮤니티 글 createdAt, 팟 참여 joinedAt 등)만 9시간 어긋난다 → 실행 환경과 상관없이 여기서 고정한다.
     */
    static final String SERVICE_TIME_ZONE = "Asia/Seoul";

    public static void main(String[] args) {
        applyServiceTimeZone();
        SpringApplication.run(SobunsobunApplication.class, args);
    }

    static void applyServiceTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone(SERVICE_TIME_ZONE));
    }
}
