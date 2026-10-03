package com.ppuri.sobunsobun.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * 행정안전부 도로명주소 API(Juso) "주소검색 API"(현황 조회) 호출.
 * ⚠️ 실제 응답 필드명(건물관리번호, 공동주택 여부, 동 목록)은 docs/API_KEYS.md도 "문서 확인 필요"라고 명시함 —
 * 아래 bdMgtSn/bdKdcd/detBdNmList는 Juso 공식 문서 기준 필드명이지만, 실제 호출 응답으로 한 번 더 확인할 것.
 * apiKey는 로그나 예외 메시지에 넣지 않는다.
 */
public class JusoAddressSearchClient implements AddressSearchClient {

    private static final String ENDPOINT = "https://www.juso.go.kr/addrlink/addrLinkApi.do";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);
    private static final String APARTMENT_CODE = "1"; // bdKdcd: 1=공동주택(아파트 등), 0=비공동주택

    private final RestClient restClient;
    private final String apiKey;

    public JusoAddressSearchClient(String apiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
        this.apiKey = apiKey;
    }

    @Override
    public List<AddressCandidate> search(String keyword) {
        URI uri = UriComponentsBuilder.fromUriString(ENDPOINT)
                .queryParam("confmKey", apiKey)
                .queryParam("currentPage", 1)
                .queryParam("countPerPage", 20)
                .queryParam("keyword", keyword)
                .queryParam("resultType", "json")
                .build()
                .toUri();

        JsonNode response = restClient.get().uri(uri).retrieve().body(JsonNode.class);
        JsonNode results = response == null ? null : response.path("results");
        if (results == null || !"0".equals(results.path("common").path("errorCode").asText())) {
            throw new IllegalStateException("도로명주소 검색 실패 응답");
        }

        List<AddressCandidate> candidates = new java.util.ArrayList<>();
        for (JsonNode juso : results.path("juso")) {
            candidates.add(toCandidate(juso));
        }
        return candidates;
    }

    private static AddressCandidate toCandidate(JsonNode juso) {
        boolean isApartment = APARTMENT_CODE.equals(juso.path("bdKdcd").asText());
        String detBdNmList = juso.path("detBdNmList").asText("");
        List<String> dongOptions = isApartment && !detBdNmList.isBlank()
                ? Arrays.stream(detBdNmList.split(","))
                        .map(String::trim)
                        .filter(dong -> !dong.isEmpty())
                        .toList()
                : List.of();

        return new AddressCandidate(
                juso.path("roadAddr").asText(),
                juso.path("bdNm").asText(),
                juso.path("bdMgtSn").asText(),
                isApartment,
                dongOptions);
    }
}
