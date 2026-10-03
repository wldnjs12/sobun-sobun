package com.ppuri.sobunsobun.auth.domain;

/** GPS 2차 확인을 요구하는 행동. 팟 목록 조회 등 1차 인증(건물 등록)만으로 되는 행동은 포함하지 않는다. */
public enum LocationCheckPurpose {
    POD_CREATE,
    POD_JOIN,
    COMMUNITY_ENTER
}
