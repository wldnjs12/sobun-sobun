package com.ppuri.sobunsobun.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

/**
 * 카카오 로컬 API "주소 검색" 호출로 도로명주소를 좌표로 변환한다.
 * apiKey는 로그나 예외 메시지에 넣지 않는다.
 */
public class KakaoGeocodingClient implements GeocodingClient {

    private static final String ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;
    private final String apiKey;

    public KakaoGeocodingClient(String apiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
        this.apiKey = apiKey;
    }

    @Override
    public Coordinates geocode(String roadAddress) {
        URI uri = UriComponentsBuilder.fromUriString(ENDPOINT)
                .queryParam("query", roadAddress)
                .build()
                .toUri();

        JsonNode response = restClient.get()
                .uri(uri)
                .header("Authorization", "KakaoAK " + apiKey)
                .retrieve()
                .body(JsonNode.class);

        JsonNode document = response == null ? null : response.path("documents").path(0);
        if (document == null || document.isMissingNode()) {
            throw new IllegalStateException("주소 좌표 변환 실패: 검색 결과 없음");
        }
        return new Coordinates(document.path("y").asDouble(), document.path("x").asDouble());
    }
}
