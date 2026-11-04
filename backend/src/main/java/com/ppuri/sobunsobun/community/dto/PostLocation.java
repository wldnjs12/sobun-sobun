package com.ppuri.sobunsobun.community.dto;

/**
 * 글이 어디쯤에서 쓰였는지를 "다른 사용자에게 보여줘도 되는 만큼만" 담는다.
 * neighborhoodName: 법정동 이름 (예 "용현동"), distanceLabel: 대략 거리 (예 "같은 건물", "약 300m").
 * 건물명·도로명주소·동·호수는 익명성을 깨뜨리므로 절대 넣지 않는다.
 */
public record PostLocation(String neighborhoodName, String distanceLabel) {

    public static final PostLocation UNKNOWN = new PostLocation(null, null);
}
