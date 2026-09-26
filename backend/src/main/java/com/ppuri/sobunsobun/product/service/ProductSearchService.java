package com.ppuri.sobunsobun.product.service;

import com.ppuri.sobunsobun.product.dto.ProductSearchResult;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductSearchService {

    /**
     * TODO(김민준):
     * 1) 네이버 쇼핑 검색 API(openapi.naver.com/v1/search/shop.json) 호출
     * 2) 가격순 정렬 후 상위 N개 반환
     * 3) API 실패/쿼터 초과 시를 대비한 예외 처리
     * 발표도 겸하는 파트이니, 완성되면 데모 시나리오에서 어떤 순서로 보여줄지도 같이 정리해볼 것.
     */
    public List<ProductSearchResult> searchLowestPrice(String keyword) {
        throw new UnsupportedOperationException("김민준 담당 - 네이버 쇼핑 API 연동 예정");
    }
}
