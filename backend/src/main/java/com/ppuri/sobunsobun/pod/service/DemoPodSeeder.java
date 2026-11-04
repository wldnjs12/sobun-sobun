package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodCategory;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 시연용 데모 데이터. 환경변수 DEMO_SEED=true(→ app.demo-seed=true)일 때만 켜진다.
 * 기본은 꺼져 있어서 운영 DB에 가짜 데이터가 섞이지 않는다.
 *
 * 건물: 주소 검색 Stub(StubAddressSearchClient)의 "학익 다세대주택"과 같은 buildingKey를 써서,
 * 데모 사용자가 그 건물을 등록하면 바로 이 팟들이 보인다. 이미 데모 팟이 있으면 아무것도 안 한다(1회성).
 * 대표는 실제 계정이 없는 데모 대표(DEMO_HOST_USER_ID)라서, 시연자는 "참여자" 흐름을 보여주면 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
// application.yml에 app.demo-seed가 없어도 환경변수 DEMO_SEED를 바로 읽는다 (둘 다 없으면 false = 꺼짐)
@ConditionalOnExpression("${app.demo-seed:${DEMO_SEED:false}}")
public class DemoPodSeeder implements ApplicationRunner {

    static final String DEMO_BUILDING_KEY = "9876543210987654321";
    static final Long DEMO_HOST_USER_ID = 900_001L;

    private final BuildingRepository buildingRepository;
    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Building building = buildingRepository.findByBuildingKey(DEMO_BUILDING_KEY)
                .orElseGet(() -> buildingRepository.save(new Building("학익 다세대주택", "인천 미추홀구 학익동 67-8",
                        DEMO_BUILDING_KEY, null, DEMO_BUILDING_KEY, 37.4425, 126.6640)));
        if (!podRepository.findByHostUserIdOrderByIdDesc(DEMO_HOST_USER_ID).isEmpty()) {
            log.info("[demo-seed] 데모 팟이 이미 있어서 건너뜀");
            return;
        }
        LocalDateTime deadline = LocalDateTime.now().plusDays(2).withHour(21).withMinute(0).withSecond(0).withNano(0);
        seed(building.getId(), PodCategory.TISSUE, "깨끗한나라 화장지 30롤", "3겹 30m, 온라인몰 구매 예정",
                "21900", 30, "롤", 10, 3, "9900", deadline);
        seed(building.getId(), PodCategory.PROCESSED_FOOD, "생수 2L×24병", "미개봉 묶음 그대로 6병씩 나눠요",
                "14400", 24, "병", 6, 4, "5400", deadline);
        seed(building.getId(), PodCategory.LAUNDRY, "액체세제 리필 3L 6개", "리필팩 미개봉 2개씩",
                "36000", 6, "개", 2, 3, "15800", deadline);
        log.info("[demo-seed] 건물 {}에 데모 팟 3개 생성", building.getId());
    }

    private void seed(Long buildingId, PodCategory category, String title, String description, String totalAmount,
                      int totalUnits, String unitLabel, int unitsPerPerson, int target, String originalPrice,
                      LocalDateTime deadline) {
        Pod pod = Pod.builder()
                .buildingId(buildingId).hostUserId(DEMO_HOST_USER_ID)
                .category(category).title(title).description(description)
                .totalAmount(new BigDecimal(totalAmount)).totalUnits(totalUnits).unitLabel(unitLabel)
                .unitsPerPerson(unitsPerPerson).targetParticipantCount(target)
                .commissionRate(new BigDecimal("0.05")).deadline(deadline)
                .pickupNote("1층 공동현관 앞").originalPrice(new BigDecimal(originalPrice))
                .build();
        Pod.validateUnits(totalUnits, unitsPerPerson, target, unitLabel);
        pod.join(); // 대표 자동 참여
        Pod saved = podRepository.save(pod);
        podParticipantRepository.save(PodParticipant.builder().podId(saved.getId()).userId(DEMO_HOST_USER_ID).build());
    }
}
