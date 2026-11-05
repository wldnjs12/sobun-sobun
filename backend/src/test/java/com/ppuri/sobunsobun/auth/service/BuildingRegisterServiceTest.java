package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterRequest;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterResponse;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BuildingRegisterServiceTest {

    private static final long USER_ID = 7L;

    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GeocodingClient geocodingClient;

    @InjectMocks
    private BuildingRegisterService buildingRegisterService;

    private BuildingRegisterRequest aptRequest() {
        return new BuildingRegisterRequest("인천 미추홀구 용현동 123-45", "bdMgtSn-1", "용현 한아름아파트", "101동");
    }

    @Test
    void 새_건물이면_지오코딩_후_생성하고_신규_유저를_등록한다() {
        given(buildingRepository.findByBuildingKey("bdMgtSn-1:101동")).willReturn(Optional.empty());
        given(geocodingClient.geocode("인천 미추홀구 용현동 123-45")).willReturn(new Coordinates(37.45, 126.65));
        given(buildingRepository.save(any(Building.class))).willAnswer(invocation -> {
            Building building = invocation.getArgument(0);
            ReflectionTestUtils.setField(building, "id", 1L);
            return building;
        });
        given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

        BuildingRegisterResponse response = buildingRegisterService.register(USER_ID, aptRequest());

        assertThat(response.buildingId()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("용현 한아름아파트");
        assertThat(response.dong()).isEqualTo("101동");
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getId()).isEqualTo(USER_ID);
        assertThat(savedUser.getValue().getBuildingId()).isEqualTo(1L);
    }

    @Test
    void 같은_buildingKey로_재등록하면_건물을_새로_만들지_않는다() {
        Building existing = new Building("용현 한아름아파트", "인천 미추홀구 용현동 123-45",
                "bdMgtSn-1", "101동", "bdMgtSn-1:101동", 37.45, 126.65);
        ReflectionTestUtils.setField(existing, "id", 1L);
        given(buildingRepository.findByBuildingKey("bdMgtSn-1:101동")).willReturn(Optional.of(existing));
        given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

        BuildingRegisterResponse response = buildingRegisterService.register(USER_ID, aptRequest());

        assertThat(response.buildingId()).isEqualTo(1L);
        verify(buildingRepository, never()).save(any());
        verify(geocodingClient, never()).geocode(any());
    }

    @Test
    void 이미_등록된_사용자가_다른_건물로_재등록하면_소속만_갱신한다() {
        Building existing = new Building("용현 한아름아파트", "인천 미추홀구 용현동 123-45",
                "bdMgtSn-1", "101동", "bdMgtSn-1:101동", 37.45, 126.65);
        ReflectionTestUtils.setField(existing, "id", 2L);
        given(buildingRepository.findByBuildingKey("bdMgtSn-1:101동")).willReturn(Optional.of(existing));
        User existingUser = new User(USER_ID, 1L);
        given(userRepository.findById(USER_ID)).willReturn(Optional.of(existingUser));

        buildingRegisterService.register(USER_ID, aptRequest());

        verify(userRepository, never()).save(any());
        assertThat(existingUser.getBuildingId()).isEqualTo(2L);
    }

    private void givenSaveAssignsId(long id) {
        given(buildingRepository.save(any(Building.class))).willAnswer(invocation -> {
            Building building = invocation.getArgument(0);
            ReflectionTestUtils.setField(building, "id", id);
            return building;
        });
    }

    /** 실제 Juso "인하로" 검색 결과처럼 건물명이 빈 문자열인 주택 */
    private BuildingRegisterRequest noNameHouseRequest(String detailAddress) {
        return new BuildingRegisterRequest("인천광역시 미추홀구 인하로 45 (용현동)", "2817010200101650006180234",
                "", "인하로 45", "인천광역시 미추홀구 용현동 165-6", null, detailAddress);
    }

    @Test
    void 건물명이_없는_주택도_도로명_건물번호_이름으로_등록된다() {
        given(buildingRepository.findByBuildingKey("2817010200101650006180234")).willReturn(Optional.empty());
        given(geocodingClient.geocode("인천광역시 미추홀구 인하로 45")).willReturn(new Coordinates(37.45, 126.65));
        givenSaveAssignsId(3L);
        given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

        BuildingRegisterResponse response = buildingRegisterService.register(USER_ID, noNameHouseRequest(" 302호 "));

        assertThat(response.name()).isEqualTo("인하로 45");
        assertThat(response.neighborhoodName()).isEqualTo("용현동");
        assertThat(response.detailAddress()).isEqualTo("302호");
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getDetailAddress()).isEqualTo("302호");
    }

    @Test
    void 화면_표시명도_없으면_도로명주소에서_이름을_만든다() {
        BuildingRegisterRequest request = new BuildingRegisterRequest(
                "인천광역시 미추홀구 인하로67번길 3 (용현동)", "x", null, null, null, null, null);

        assertThat(BuildingRegisterService.resolveName(request)).isEqualTo("인하로67번길 3");
    }

    @Test
    void 상세주소는_건물이_아니라_사용자에만_저장된다() {
        given(buildingRepository.findByBuildingKey("2817010200101650006180234")).willReturn(Optional.empty());
        given(geocodingClient.geocode(any())).willReturn(new Coordinates(37.45, 126.65));
        givenSaveAssignsId(3L);
        User existingUser = new User(USER_ID, 1L, "101호");
        given(userRepository.findById(USER_ID)).willReturn(Optional.of(existingUser));

        buildingRegisterService.register(USER_ID, noNameHouseRequest("2층"));

        ArgumentCaptor<Building> savedBuilding = ArgumentCaptor.forClass(Building.class);
        verify(buildingRepository).save(savedBuilding.capture());
        assertThat(savedBuilding.getValue().getName()).doesNotContain("2층");
        assertThat(savedBuilding.getValue().getBuildingKey()).doesNotContain("2층");
        assertThat(existingUser.getDetailAddress()).isEqualTo("2층");
        assertThat(existingUser.getBuildingId()).isEqualTo(3L);
    }

    @Test
    void 상세주소를_비워서_재등록하면_예전_상세주소는_지워진다() {
        Building existing = new Building("인하로 45", "인천광역시 미추홀구 인하로 45 (용현동)",
                "2817010200101650006180234", null, "2817010200101650006180234", 37.45, 126.65);
        ReflectionTestUtils.setField(existing, "id", 3L);
        given(buildingRepository.findByBuildingKey("2817010200101650006180234")).willReturn(Optional.of(existing));
        User existingUser = new User(USER_ID, 3L, "302호");
        given(userRepository.findById(USER_ID)).willReturn(Optional.of(existingUser));

        BuildingRegisterResponse response = buildingRegisterService.register(USER_ID, noNameHouseRequest("  "));

        assertThat(existingUser.getDetailAddress()).isNull();
        assertThat(response.detailAddress()).isNull();
    }

    @Test
    void 도로명주소로_좌표를_못_찾으면_지번_주소로_다시_시도한다() {
        given(buildingRepository.findByBuildingKey("2817010200101650006180234")).willReturn(Optional.empty());
        willThrow(new IllegalStateException("검색 결과 없음")).given(geocodingClient).geocode("인천광역시 미추홀구 인하로 45");
        willThrow(new IllegalStateException("검색 결과 없음")).given(geocodingClient).geocode("인천광역시 미추홀구 인하로 45 (용현동)");
        given(geocodingClient.geocode("인천광역시 미추홀구 용현동 165-6")).willReturn(new Coordinates(37.451, 126.651));
        givenSaveAssignsId(3L);
        given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

        BuildingRegisterResponse response = buildingRegisterService.register(USER_ID, noNameHouseRequest(null));

        assertThat(response.buildingId()).isEqualTo(3L);
    }

    @Test
    void 좌표를_끝내_못_찾으면_건물을_만들지_않고_GEOCODING_FAILED로_거절한다() {
        given(buildingRepository.findByBuildingKey("2817010200101650006180234")).willReturn(Optional.empty());
        willThrow(new IllegalStateException("검색 결과 없음")).given(geocodingClient).geocode(any());

        assertThatThrownBy(() -> buildingRegisterService.register(USER_ID, noNameHouseRequest(null)))
                .isInstanceOf(AddressException.class)
                .extracting("code").isEqualTo(AddressException.GEOCODING_FAILED);
        verify(buildingRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }
}
