package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.LocationCheck;
import com.ppuri.sobunsobun.auth.domain.LocationCheckPurpose;
import com.ppuri.sobunsobun.auth.domain.LocationCheckRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.LocationCheckRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LocationCheckServiceTest {

    // 건물 기준 좌표. 위도 0.0001도 ≈ 11.1m
    private static final double LAT = 37.5665;
    private static final double LON = 126.9780;
    private static final long BUILDING_ID = 1L;
    private static final long USER_ID = 7L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private LocationCheckRepository locationCheckRepository;

    @InjectMocks
    private LocationCheckService locationCheckService;

    private void givenUserAndBuilding() {
        Building building = new Building("테스트빌라", "서울 강남구 테스트로 1", "bdMgtSn", null, "bdMgtSn", LAT, LON);
        ReflectionTestUtils.setField(building, "id", BUILDING_ID); // id는 DB가 채우는 값이라 테스트에서만 직접 넣는다
        given(userRepository.findById(USER_ID)).willReturn(Optional.of(new User(USER_ID, BUILDING_ID)));
        given(buildingRepository.findById(BUILDING_ID)).willReturn(Optional.of(building));
    }

    @Test
    void 반경_안이면_성공하고_판정결과를_기록한다() {
        givenUserAndBuilding();

        // 약 33m 북쪽
        boolean result = locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT + 0.0003, LON, LocationCheckPurpose.POD_CREATE));

        assertThat(result).isTrue();
        ArgumentCaptor<LocationCheck> saved = ArgumentCaptor.forClass(LocationCheck.class);
        verify(locationCheckRepository).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getValue().getBuildingId()).isEqualTo(BUILDING_ID);
        assertThat(saved.getValue().isSuccess()).isTrue();
        assertThat(saved.getValue().getPurpose()).isEqualTo(LocationCheckPurpose.POD_CREATE);
    }

    @Test
    void 반경_밖이면_OUT_OF_RANGE_예외를_던지고_실패_기록을_남긴다() {
        givenUserAndBuilding();

        assertThatThrownBy(() -> locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT + 0.0010, LON, LocationCheckPurpose.POD_JOIN))) // 약 111m 북쪽
                .isInstanceOf(LocationCheckException.class)
                .extracting("code").isEqualTo("OUT_OF_RANGE");

        ArgumentCaptor<LocationCheck> saved = ArgumentCaptor.forClass(LocationCheck.class);
        verify(locationCheckRepository).save(saved.capture());
        assertThat(saved.getValue().isSuccess()).isFalse();
    }

    @Test
    void 반경_100m_경계_안쪽은_통과하고_바깥쪽은_실패() {
        givenUserAndBuilding();
        double metersPerDegreeLat = Math.PI / 180 * 6_371_000; // ≈ 111,195m

        assertThat(locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT + 99.9 / metersPerDegreeLat, LON, LocationCheckPurpose.POD_CREATE)))
                .isTrue();
        assertThatThrownBy(() -> locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT + 100.1 / metersPerDegreeLat, LON, LocationCheckPurpose.POD_CREATE)))
                .isInstanceOf(LocationCheckException.class);
    }

    @Test
    void 등록된_건물이_없으면_BUILDING_NOT_REGISTERED() {
        given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT, LON, LocationCheckPurpose.POD_CREATE)))
                .isInstanceOf(LocationCheckException.class)
                .extracting("code").isEqualTo("BUILDING_NOT_REGISTERED");
    }

    @Test
    void 데모모드면_요청_좌표와_무관하게_건물_좌표로_판정해서_항상_통과한다() {
        givenUserAndBuilding();
        ReflectionTestUtils.setField(locationCheckService, "demoMode", true);

        // 반경을 훨씬 벗어난 좌표를 보내도 데모모드라 건물 좌표로 재판정되어 통과한다.
        boolean result = locationCheckService.check(USER_ID,
                new LocationCheckRequest(LAT + 10.0, LON + 10.0, LocationCheckPurpose.COMMUNITY_ENTER));

        assertThat(result).isTrue();
    }
}
