package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressCandidate;

import java.util.List;

/** Juso API 키 없이 로컬 개발할 때 쓰는 가짜 구현체. 키워드와 무관하게 정해 둔 데모 후보를 돌려준다. */
public class StubAddressSearchClient implements AddressSearchClient {

    @Override
    public List<AddressCandidate> search(String keyword) {
        return List.of(
                new AddressCandidate(
                        "인천 미추홀구 용현동 123-45",
                        "용현 한아름아파트",
                        "1234567890123456789",
                        true,
                        List.of("101동", "102동", "103동")),
                new AddressCandidate(
                        "인천 미추홀구 학익동 67-8",
                        "학익 다세대주택",
                        "9876543210987654321",
                        false,
                        List.of()));
    }
}
