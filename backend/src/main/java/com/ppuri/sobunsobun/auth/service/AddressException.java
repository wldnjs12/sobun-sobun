package com.ppuri.sobunsobun.auth.service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 주소 검색·건물 등록 중 생긴 실패. message는 프론트 화면에 그대로 보여줄 문구다.
 * 왜 HttpStatus를 같이 들고 다니나: "검색어가 이상함(400)"과 "주소 API가 죽음(503)"은
 * 프론트가 다르게 안내해야 해서(다시 입력 vs 다시 시도) 상태 코드로도 구분해 준다.
 * 외부 API 키 같은 비밀값은 절대 message에 넣지 않는다.
 */
@Getter
public class AddressException extends RuntimeException {

    /** 검색어가 너무 짧거나, 특수문자만 있거나, Juso가 "더 자세히 입력"이라고 거절한 경우 → 400 */
    public static final String INVALID_KEYWORD = "INVALID_KEYWORD";
    /** Juso 응답이 늦거나(타임아웃) 연결이 안 되는 경우 → 503 */
    public static final String ADDRESS_API_UNAVAILABLE = "ADDRESS_API_UNAVAILABLE";
    /** Juso가 키 오류 등 우리 쪽 설정 문제로 거절한 경우 → 502 (사용자는 할 수 있는 게 없음) */
    public static final String ADDRESS_API_ERROR = "ADDRESS_API_ERROR";
    /** 건물 좌표(지오코딩)를 못 구한 경우 → 503. 좌표 없이 건물을 만들면 동네(반경) 판정이 깨진다. */
    public static final String GEOCODING_FAILED = "GEOCODING_FAILED";

    private final String code;
    private final HttpStatus status;

    public AddressException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static AddressException invalidKeyword(String message) {
        return new AddressException(INVALID_KEYWORD, HttpStatus.BAD_REQUEST, message);
    }

    public static AddressException unavailable() {
        return new AddressException(ADDRESS_API_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE,
                "주소 검색이 잠시 늦어지고 있어요. 잠시 후 다시 시도해주세요.");
    }

    public static AddressException apiError() {
        return new AddressException(ADDRESS_API_ERROR, HttpStatus.BAD_GATEWAY,
                "주소 검색 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.");
    }
}
