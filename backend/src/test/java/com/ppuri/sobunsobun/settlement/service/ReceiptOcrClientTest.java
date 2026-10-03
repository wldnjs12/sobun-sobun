package com.ppuri.sobunsobun.settlement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 실제 네트워크 호출 없이 응답 파싱과 구현체 선택만 검증한다 (실제 키는 테스트에 넣지 않는다) */
class ReceiptOcrClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void Clova_응답을_줄바꿈_포함_텍스트로_변환() throws Exception {
        String response = """
                {"images":[{"inferResult":"SUCCESS","fields":[
                  {"inferText":"합계","lineBreak":false},
                  {"inferText":"12,300","lineBreak":true},
                  {"inferText":"감사합니다","lineBreak":true}
                ]}]}
                """;

        String text = NaverReceiptOcrClient.toText(objectMapper.readTree(response));

        assertThat(text).isEqualTo("합계 12,300\n감사합니다\n");
        assertThat(ReceiptAmountExtractor.extractTotal(text)).hasValueSatisfying(
                amount -> assertThat(amount).isEqualByComparingTo("12300"));
    }

    @Test
    void Clova_인식_실패_응답이면_예외() throws Exception {
        String response = """
                {"images":[{"inferResult":"FAILURE","fields":[]}]}
                """;

        assertThatThrownBy(() -> NaverReceiptOcrClient.toText(objectMapper.readTree(response)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 키가_없으면_Stub_있으면_Naver_구현체() {
        ReceiptOcrConfig config = new ReceiptOcrConfig();

        assertThat(config.receiptOcrClient("", "")).isInstanceOf(StubReceiptOcrClient.class);
        assertThat(config.receiptOcrClient("https://example.invalid/ocr", "")).isInstanceOf(StubReceiptOcrClient.class);
        assertThat(config.receiptOcrClient("https://example.invalid/ocr", "dummy"))
                .isInstanceOf(NaverReceiptOcrClient.class);
    }
}
