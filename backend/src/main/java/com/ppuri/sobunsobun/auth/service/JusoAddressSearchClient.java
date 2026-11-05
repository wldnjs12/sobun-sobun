package com.ppuri.sobunsobun.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 행정안전부 도로명주소 API(Juso) "주소검색 API" 호출.
 * 2026-11 운영 서버 응답으로 필드명 확인: roadAddr, jibunAddr, bdNm, bdMgtSn, bdKdcd, detBdNmList, rn, buldMnnm, buldSlno, emdNm,
 * common.totalCount(문자열), common.errorCode, common.errorMessage.
 *
 * 주의: Juso는 HTTP 200으로 응답하면서 common.errorCode에 실패 사유를 담는다 ("0" = 정상).
 * apiKey는 로그나 예외 메시지에 넣지 않는다.
 */
@Slf4j
public class JusoAddressSearchClient implements AddressSearchClient {

    public static final int PAGE_SIZE = 20;

    private static final String ENDPOINT = "https://www.juso.go.kr/addrlink/addrLinkApi.do";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);
    private static final String APARTMENT_CODE = "1"; // bdKdcd: 1=공동주택(아파트 등), 0=비공동주택

    /**
     * 사용자가 검색어를 고치면 해결되는 에러 → 400.
     * E0005 검색어 없음, E0006 시도만 입력, E0008 한 글자, E0009 숫자만, E0010 너무 김,
     * E0011 긴 숫자, E0012 특수문자+숫자만, E0013 특수문자/SQL 예약어 포함
     */
    private static final Set<String> KEYWORD_ERRORS =
            Set.of("E0005", "E0006", "E0008", "E0009", "E0010", "E0011", "E0012", "E0013");
    /** E0015: 검색 범위 초과 — 너무 넓게 검색해서 뒤 페이지를 요청했을 때 */
    private static final String TOO_BROAD = "E0015";

    private static final Pattern FIRST_NUMBER = Pattern.compile("(\\d+)");

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
    public AddressSearchPage search(String keyword, int page) {
        URI uri = UriComponentsBuilder.fromUriString(ENDPOINT)
                .queryParam("confmKey", apiKey)
                .queryParam("currentPage", page)
                .queryParam("countPerPage", PAGE_SIZE)
                .queryParam("keyword", keyword)
                .queryParam("resultType", "json")
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        JsonNode response;
        try {
            response = restClient.get().uri(uri).retrieve().body(JsonNode.class);
        } catch (ResourceAccessException e) {
            // 타임아웃·연결 실패. e.getMessage()에는 요청 URL(=키 포함)이 들어갈 수 있어서 예외 종류만 남긴다.
            log.warn("Juso 주소 검색 연결 실패/타임아웃: {}", e.getClass().getSimpleName());
            throw AddressException.unavailable();
        } catch (RestClientException e) {
            log.warn("Juso 주소 검색 HTTP 오류: {}", e.getClass().getSimpleName());
            throw AddressException.unavailable();
        }
        return parse(response, page);
    }

    /** Juso JSON 응답 → 페이지 객체. 네트워크 없이 테스트할 수 있게 분리했다. */
    static AddressSearchPage parse(JsonNode response, int page) {
        JsonNode results = response == null ? null : response.path("results");
        if (results == null || results.isMissingNode()) {
            log.error("Juso 주소 검색: 예상과 다른 응답 형식");
            throw AddressException.apiError();
        }
        JsonNode common = results.path("common");
        String errorCode = common.path("errorCode").asText("");
        if (!"0".equals(errorCode)) {
            throw toException(errorCode, common.path("errorMessage").asText(""));
        }

        List<AddressCandidate> candidates = new ArrayList<>();
        for (JsonNode juso : results.path("juso")) {
            candidates.add(toCandidate(juso));
        }
        int totalCount = parseIntOrZero(common.path("totalCount").asText("0"));
        return AddressSearchPage.of(candidates, totalCount, page, PAGE_SIZE);
    }

    private static AddressException toException(String errorCode, String errorMessage) {
        if (KEYWORD_ERRORS.contains(errorCode)) {
            log.info("Juso 검색어 거절 {}: {}", errorCode, errorMessage);
            return AddressException.invalidKeyword("검색어를 조금 더 자세히 입력해주세요 (예: 인하로67번길, 용현동 123)");
        }
        if (TOO_BROAD.equals(errorCode)) {
            return AddressException.invalidKeyword("검색 결과가 너무 많아요. 도로명이나 동 이름을 더 자세히 입력해주세요");
        }
        // E0001(승인되지 않은 키), E0014(키 기간 만료), -999(Juso 시스템 에러) 등 — 사용자가 고칠 수 없는 문제.
        // 운영자가 알아챌 수 있게 error로 남긴다 (키 값은 남기지 않음).
        log.error("Juso 주소 검색 실패 {}: {} (JUSO_API_KEY 설정/만료 여부 확인)", errorCode, errorMessage);
        return AddressException.apiError();
    }

    private static AddressCandidate toCandidate(JsonNode juso) {
        boolean isApartment = APARTMENT_CODE.equals(juso.path("bdKdcd").asText());
        String detBdNmList = juso.path("detBdNmList").asText("");
        List<String> dongOptions = isApartment && !detBdNmList.isBlank()
                ? sortDongs(Arrays.stream(detBdNmList.split(","))
                        .map(String::trim)
                        .filter(dong -> !dong.isEmpty())
                        .distinct()
                        .toList())
                : List.of();

        String roadAddress = juso.path("roadAddr").asText();
        String buildingName = juso.path("bdNm").asText("").trim();
        String roadNumberName = AddressNames.roadNumberName(
                juso.path("rn").asText(""), juso.path("buldMnnm").asText(""), juso.path("buldSlno").asText(""));
        if (roadNumberName == null) {
            roadNumberName = AddressNames.roadNumberName(juso.path("roadAddrPart1").asText(roadAddress));
        }

        return new AddressCandidate(
                roadAddress,
                juso.path("jibunAddr").asText(""),
                buildingName,
                AddressNames.displayName(buildingName, roadNumberName),
                emptyToNull(juso.path("emdNm").asText("")),
                juso.path("bdMgtSn").asText(),
                isApartment,
                dongOptions);
    }

    /**
     * Juso의 동 목록은 "122동,121동,…,유치원,115동"처럼 순서가 뒤섞여 온다(실제 학익동 아파트 응답).
     * 숫자 동은 번호순으로, "유치원·관리동"처럼 숫자 없는 시설은 맨 뒤로 보낸다.
     */
    static List<String> sortDongs(List<String> dongs) {
        return dongs.stream()
                .sorted(Comparator.comparingInt(JusoAddressSearchClient::dongNumber)
                        .thenComparing(Comparator.naturalOrder()))
                .toList();
    }

    private static int dongNumber(String dong) {
        Matcher m = FIRST_NUMBER.matcher(dong);
        if (!m.find()) return Integer.MAX_VALUE;
        String digits = m.group(1);
        return digits.length() > 9 ? Integer.MAX_VALUE - 1 : Integer.parseInt(digits);
    }

    private static int parseIntOrZero(String text) {
        try {
            return Integer.parseInt(text.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String emptyToNull(String text) {
        return text == null || text.isBlank() ? null : text;
    }
}
