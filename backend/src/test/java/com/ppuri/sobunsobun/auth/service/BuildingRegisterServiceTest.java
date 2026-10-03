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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
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
}
