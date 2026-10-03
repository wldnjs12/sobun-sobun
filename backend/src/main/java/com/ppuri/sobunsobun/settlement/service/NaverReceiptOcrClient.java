package com.ppuri.sobunsobun.settlement.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Naver Clova OCR 일반(General) 도메인 호출.
 * 영수증 특화 도메인은 승인·월정액이 필요해서, 일반 도메인으로 전체 텍스트를 받고 총액은 정규식으로 뽑는다 (docs/API_KEYS.md).
 * invokeUrl/secretKey는 로그나 예외 메시지에 넣지 않는다.
 */
public class NaverReceiptOcrClient implements ReceiptOcrClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient restClient;
    private final String invokeUrl;
    private final String secretKey;

    public NaverReceiptOcrClient(String invokeUrl, String secretKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
        this.invokeUrl = invokeUrl;
        this.secretKey = secretKey;
    }

    @Override
    public String recognizeText(byte[] image, String format) {
        Map<String, Object> body = Map.of(
                "version", "V2",
                "requestId", UUID.randomUUID().toString(),
                "timestamp", System.currentTimeMillis(),
                "lang", "ko",
                "images", List.of(Map.of(
                        "format", format,
                        "name", "receipt",
                        "data", Base64.getEncoder().encodeToString(image))));

        JsonNode response = restClient.post()
                .uri(URI.create(invokeUrl)) // 값이 잘못돼도 앱 기동은 막지 않고, 호출 실패(success=false)로 처리되게 여기서 파싱
                .header("X-OCR-SECRET", secretKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        return toText(response);
    }

    /**
     * 응답의 images[0].fields[].inferText를 이어 붙인다. lineBreak=true인 글자 뒤에서 줄을 바꾼다.
     * inferResult가 SUCCESS가 아니면(흐림 등으로 인식 실패) 예외를 던진다.
     */
    static String toText(JsonNode response) {
        JsonNode image = response == null ? null : response.path("images").path(0);
        if (image == null || !"SUCCESS".equals(image.path("inferResult").asText())) {
            throw new IllegalStateException("OCR 인식 실패 응답");
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode field : image.path("fields")) {
            text.append(field.path("inferText").asText());
            text.append(field.path("lineBreak").asBoolean() ? "\n" : " ");
        }
        return text.toString();
    }
}
