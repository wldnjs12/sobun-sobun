package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class BuildingAccessServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BuildingAccessService buildingAccessService;

    @Test
    void 소속_건물이면_통과한다() {
        given(userRepository.findById(7L)).willReturn(Optional.of(new User(7L, 1L)));

        assertThat(buildingAccessService.isMember(7L, 1L)).isTrue();
        buildingAccessService.requireMembership(7L, 1L); // 예외 없이 통과
    }

    @Test
    void 다른_건물_소속이면_거부된다() {
        given(userRepository.findById(7L)).willReturn(Optional.of(new User(7L, 1L)));

        assertThat(buildingAccessService.isMember(7L, 2L)).isFalse();
        assertThatThrownBy(() -> buildingAccessService.requireMembership(7L, 2L))
                .isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 등록되지_않은_사용자는_소속이_아닌_것으로_본다() {
        given(userRepository.findById(999L)).willReturn(Optional.empty());

        assertThat(buildingAccessService.isMember(999L, 1L)).isFalse();
        assertThatThrownBy(() -> buildingAccessService.requireMembership(999L, 1L))
                .isInstanceOf(BuildingAccessDeniedException.class);
    }

    @Test
    void 메시지를_지정하면_그_메시지로_예외가_던져진다() {
        given(userRepository.findById(7L)).willReturn(Optional.of(new User(7L, 1L)));

        assertThatThrownBy(() -> buildingAccessService.requireMembership(7L, 2L, "다른 건물의 글은 볼 수 없어요."))
                .isInstanceOf(BuildingAccessDeniedException.class)
                .hasMessage("다른 건물의 글은 볼 수 없어요.");
    }
}
