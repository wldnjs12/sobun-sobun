package com.ppuri.sobunsobun.auth.service;

/** 카카오 API 키 없이 로컬 개발할 때 쓰는 가짜 구현체. 주소와 무관하게 인하대학교 근처 고정 좌표를 돌려준다. */
public class StubGeocodingClient implements GeocodingClient {

    private static final double INHA_UNIV_LATITUDE = 37.4502;
    private static final double INHA_UNIV_LONGITUDE = 126.6558;

    @Override
    public Coordinates geocode(String roadAddress) {
        return new Coordinates(INHA_UNIV_LATITUDE, INHA_UNIV_LONGITUDE);
    }
}
