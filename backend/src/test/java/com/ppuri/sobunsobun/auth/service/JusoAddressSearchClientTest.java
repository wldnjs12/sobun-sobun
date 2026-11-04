package com.ppuri.sobunsobun.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 네트워크 없이 Juso 응답 JSON(운영 서버에서 본 실제 형태를 줄인 것) → 우리 DTO 변환만 확인한다. */
class JusoAddressSearchClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SAMPLE = """
            {"results":{
              "common":{"errorMessage":"정상","countPerPage":"20","totalCount":"137","errorCode":"0","currentPage":"1"},
              "juso":[
                {"roadAddr":"인천광역시 미추홀구 인하로 45 (용현동)","roadAddrPart1":"인천광역시 미추홀구 인하로 45",
                 "jibunAddr":"인천광역시 미추홀구 용현동 165-6","bdNm":"","bdMgtSn":"2817010200101650006180234",
                 "bdKdcd":"0","detBdNmList":"","rn":"인하로","buldMnnm":"45","buldSlno":"0","emdNm":"용현동"},
                {"roadAddr":"인천광역시 미추홀구 인하로 55-1 (용현동)","roadAddrPart1":"인천광역시 미추홀구 인하로 55-1",
                 "jibunAddr":"인천광역시 미추홀구 용현동 199-4","bdNm":" ","bdMgtSn":"2817010200101990004068257",
                 "bdKdcd":"0","detBdNmList":"","rn":"인하로","buldMnnm":"55","buldSlno":"1","emdNm":"용현동"},
                {"roadAddr":"인천광역시 미추홀구 매소홀로 340 (학익동, 학익동풍림아이원아파트)",
                 "roadAddrPart1":"인천광역시 미추홀구 매소홀로 340","jibunAddr":"인천광역시 미추홀구 학익동 207-11",
                 "bdNm":"학익동풍림아이원아파트","bdMgtSn":"2817010300102070011000001","bdKdcd":"1",
                 "detBdNmList":"122동,103동,유치원,110동, 101동","rn":"매소홀로","buldMnnm":"340","buldSlno":"0","emdNm":"학익동"}
              ]}}
            """;

    private JsonNode json(String text) throws Exception {
        return objectMapper.readTree(text);
    }

    @Test
    void 건물명이_없으면_도로명_건물번호를_표시명으로_쓰고_지번도_내려준다() throws Exception {
        AddressSearchPage page = JusoAddressSearchClient.parse(json(SAMPLE), 1);

        assertThat(page.totalCount()).isEqualTo(137);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.hasMore()).isTrue();
        assertThat(page.items()).hasSize(3);

        AddressCandidate house = page.items().get(0);
        assertThat(house.buildingName()).isEmpty();
        assertThat(house.displayName()).isEqualTo("인하로 45");
        assertThat(house.jibunAddress()).isEqualTo("인천광역시 미추홀구 용현동 165-6");
        assertThat(house.neighborhoodName()).isEqualTo("용현동");
        assertThat(house.isApartment()).isFalse();
        assertThat(house.dongOptions()).isEmpty();

        assertThat(page.items().get(1).displayName()).isEqualTo("인하로 55-1");
    }

    @Test
    void 아파트는_동_목록을_번호순으로_정리하고_시설은_뒤로_보낸다() throws Exception {
        AddressCandidate apt = JusoAddressSearchClient.parse(json(SAMPLE), 1).items().get(2);

        assertThat(apt.isApartment()).isTrue();
        assertThat(apt.displayName()).isEqualTo("학익동풍림아이원아파트");
        assertThat(apt.dongOptions()).containsExactly("101동", "103동", "110동", "122동", "유치원");
    }

    @Test
    void 마지막_페이지면_hasMore가_false다() throws Exception {
        AddressSearchPage page = JusoAddressSearchClient.parse(json(SAMPLE), 7); // 7 * 20 = 140 >= 137

        assertThat(page.hasMore()).isFalse();
    }

    @Test
    void 키_오류_E0001은_502와_일시적_문제_문구로_바꾼다() throws Exception {
        String body = """
                {"results":{"common":{"errorCode":"E0001","errorMessage":"승인되지 않은 KEY 입니다.","totalCount":"0"},"juso":null}}
                """;

        assertThatThrownBy(() -> JusoAddressSearchClient.parse(json(body), 1))
                .isInstanceOfSatisfying(AddressException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
                    assertThat(e.getCode()).isEqualTo(AddressException.ADDRESS_API_ERROR);
                    assertThat(e.getMessage()).contains("일시적인 문제");
                });
    }

    @Test
    void 검색어_오류_E0006은_400으로_바꾼다() throws Exception {
        String body = """
                {"results":{"common":{"errorCode":"E0006","errorMessage":"주소를 상세히 입력해 주시기 바랍니다.","totalCount":"0"},"juso":null}}
                """;

        assertThatThrownBy(() -> JusoAddressSearchClient.parse(json(body), 1))
                .isInstanceOfSatisfying(AddressException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(e.getCode()).isEqualTo(AddressException.INVALID_KEYWORD);
                });
    }

    @Test
    void 결과가_0건이면_빈_목록() throws Exception {
        String body = """
                {"results":{"common":{"errorCode":"0","errorMessage":"정상","totalCount":"0"},"juso":[]}}
                """;

        AddressSearchPage page = JusoAddressSearchClient.parse(json(body), 1);

        assertThat(page.items()).isEqualTo(List.of());
        assertThat(page.totalCount()).isZero();
        assertThat(page.hasMore()).isFalse();
    }
}
