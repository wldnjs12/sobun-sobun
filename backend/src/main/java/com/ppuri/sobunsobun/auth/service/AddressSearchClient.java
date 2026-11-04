package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;

/**
 * 주소 후보 검색. 실제 Juso(행정안전부 도로명주소 API) 구현체와 키 없이 쓰는 Stub 구현체가 있다 (AddressSearchConfig에서 선택).
 * keyword는 AddressKeyword.sanitize()를 거친 값이 들어온다고 가정한다. page는 1부터.
 */
public interface AddressSearchClient {

    AddressSearchPage search(String keyword, int page);
}
