package com.ppuri.sobunsobun.auth.service;

/**
 * 주소 → 좌표 변환. 건물을 새로 등록할 때 1번만 호출한다 (이미 있는 건물이면 저장된 좌표를 그대로 쓴다).
 * 실제 카카오 로컬 API 구현체와 키 없이 쓰는 Stub 구현체가 있다 (GeocodingConfig에서 선택).
 */
public interface GeocodingClient {

    Coordinates geocode(String roadAddress);
}
