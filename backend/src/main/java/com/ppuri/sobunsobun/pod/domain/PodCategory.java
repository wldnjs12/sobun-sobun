package com.ppuri.sobunsobun.pod.domain;

/**
 * 팟 카테고리 (2026-11 기획 개편). 생필품 + 밀봉 가공식품(생수·라면 등 미개봉 상온 보관)까지 허용.
 * 신선 식재료는 위생·보관 리스크가 커서 카테고리 자체를 두지 않는다.
 * DB에는 이름(TISSUE 등)을 문자열로 저장하고, 화면에는 label을 보여준다.
 */
public enum PodCategory {
    TISSUE("휴지·물티슈"),
    LAUNDRY("세제·세탁"),
    BATH("샴푸·욕실"),
    KITCHEN("주방용품"),
    CLEANING("청소용품"),
    DAILY("생활잡화"),
    PROCESSED_FOOD("생수·가공식품"),
    ETC("기타");

    private final String label;

    PodCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** 쿼리 파라미터 문자열 → enum. 비어 있으면 null(=전체), 모르는 값이면 400. */
    public static PodCategory fromParam(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) return null;
        try {
            return PodCategory.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new PodRuleViolationException("알 수 없는 카테고리예요: " + value);
        }
    }
}
