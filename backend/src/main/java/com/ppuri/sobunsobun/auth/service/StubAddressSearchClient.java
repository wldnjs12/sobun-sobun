package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;

import java.util.Arrays;
import java.util.List;

/**
 * Juso API 키 없이 로컬 개발할 때 쓰는 가짜 구현체.
 * 용현동·학익동을 흉내 낸 가짜 주소 10건 안에서 검색어로 거른다 (실제 주소·건물관리번호가 아니다).
 * 실제 Juso처럼 건물명이 없는 주택(buildingName ""), 동 목록이 있는 아파트, 동 목록이 없는 아파트를 섞어 뒀다.
 *
 * 한 페이지 크기를 일부러 작게(5건) 둬서 키 없이도 "더 보기" 동작을 확인할 수 있게 했다.
 */
public class StubAddressSearchClient implements AddressSearchClient {

    static final int DEFAULT_PAGE_SIZE = 5;

    private static final List<AddressCandidate> FAKE_ADDRESSES = List.of(
            house("인천광역시 미추홀구 인하로67번길 3 (용현동)", "인천광역시 미추홀구 용현동 600-1", "", "STUB-0001"),
            house("인천광역시 미추홀구 인하로67번길 12 (용현동)", "인천광역시 미추홀구 용현동 601-12", "제니스빌", "STUB-0002"),
            house("인천광역시 미추홀구 인하로59번길 8 (용현동)", "인천광역시 미추홀구 용현동 605-3", "인하하우스", "STUB-0003"),
            house("인천광역시 미추홀구 인하로59번길 21-1 (용현동)", "인천광역시 미추홀구 용현동 607-9", "", "STUB-0004"),
            house("인천광역시 미추홀구 인하로 45 (용현동)", "인천광역시 미추홀구 용현동 123-4", "", "STUB-0005"),
            house("인천광역시 미추홀구 경인남길 102 (용현동)", "인천광역시 미추홀구 용현동 123-45", "용현 원룸텔", "STUB-0006"),
            apartment("인천광역시 미추홀구 매소홀로 220 (학익동)", "인천광역시 미추홀구 학익동 700",
                    "학익 한마음아파트", "STUB-0007", List.of("101동", "102동", "103동", "104동")),
            apartment("인천광역시 미추홀구 독배로 300 (용현동)", "인천광역시 미추홀구 용현동 650",
                    "용현 그린아파트", "STUB-0008", List.of()), // 동 목록을 안 주는 아파트 → 직접 입력 흐름 확인용
            house("인천광역시 미추홀구 학익소로 15 (학익동)", "인천광역시 미추홀구 학익동 263-7", "", "STUB-0009"),
            house("인천광역시 미추홀구 학익소로 30 (학익동)", "인천광역시 미추홀구 학익동 265-1", "학익 다세대주택", "STUB-0010"));

    private final int pageSize;

    public StubAddressSearchClient() {
        this(DEFAULT_PAGE_SIZE);
    }

    StubAddressSearchClient(int pageSize) {
        this.pageSize = pageSize;
    }

    @Override
    public AddressSearchPage search(String keyword, int page) {
        // 공백으로 나눈 단어가 전부 들어 있는 주소만 (예: "학익 아파트" → 학익 AND 아파트). 띄어쓰기 차이는 무시한다.
        List<String> tokens = Arrays.stream(keyword.split("\\s+"))
                .map(StubAddressSearchClient::normalize)
                .filter(token -> !token.isEmpty())
                .toList();
        List<AddressCandidate> matched = FAKE_ADDRESSES.stream()
                .filter(candidate -> {
                    String haystack = normalize(candidate.roadAddress() + candidate.jibunAddress() + candidate.buildingName());
                    return tokens.stream().allMatch(haystack::contains);
                })
                .toList();

        int from = Math.min((page - 1) * pageSize, matched.size());
        int to = Math.min(from + pageSize, matched.size());
        return AddressSearchPage.of(matched.subList(from, to), matched.size(), page, pageSize);
    }

    private static String normalize(String text) {
        return text.replaceAll("\\s+", "");
    }

    private static AddressCandidate house(String roadAddress, String jibunAddress, String buildingName, String bdMgtSn) {
        return new AddressCandidate(roadAddress, jibunAddress, buildingName,
                AddressNames.displayName(buildingName, AddressNames.roadNumberName(roadAddress)),
                NeighborhoodService.neighborhoodName(roadAddress), bdMgtSn, false, List.of());
    }

    private static AddressCandidate apartment(String roadAddress, String jibunAddress, String buildingName,
                                              String bdMgtSn, List<String> dongOptions) {
        return new AddressCandidate(roadAddress, jibunAddress, buildingName,
                AddressNames.displayName(buildingName, AddressNames.roadNumberName(roadAddress)),
                NeighborhoodService.neighborhoodName(roadAddress), bdMgtSn, true, dongOptions);
    }
}
