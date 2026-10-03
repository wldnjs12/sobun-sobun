package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressCandidate;

import java.util.List;

/**
 * 주소 후보 검색. 실제 Juso(행정안전부 도로명주소 API) 구현체와 키 없이 쓰는 Stub 구현체가 있다 (AddressSearchConfig에서 선택).
 */
public interface AddressSearchClient {

    List<AddressCandidate> search(String keyword);
}
