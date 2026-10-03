package com.ppuri.sobunsobun.settlement.service;

import com.ppuri.sobunsobun.settlement.domain.SettlementException;
import com.ppuri.sobunsobun.settlement.domain.SettlementRepository;
import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

/** 영수증 업로드 → OCR → 총액 인식 단위 테스트 (OCR은 Stub/람다로 대체) */
class ReceiptRecognizeTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};

    private static SettlementService serviceWith(ReceiptOcrClient ocrClient) {
        return new SettlementService(ocrClient, mock(PodParticipantCountReader.class), mock(SettlementRepository.class));
    }

    private static MockMultipartFile receipt(byte[] content) {
        return new MockMultipartFile("receipt", "receipt.jpg", "image/jpeg", content);
    }

    @Test
    void 인식_성공하면_총액과_success_true() {
        ReceiptOcrResult result = serviceWith(new StubReceiptOcrClient()).recognizeReceipt(receipt(JPEG));

        assertThat(result.success()).isTrue();
        assertThat(result.recognizedAmount()).isEqualByComparingTo("12300");
    }

    @Test
    void PNG도_받는다() {
        String[] format = new String[1];
        ReceiptOcrClient client = (image, fmt) -> {
            format[0] = fmt;
            return "합계 5,000";
        };

        ReceiptOcrResult result = serviceWith(client).recognizeReceipt(receipt(PNG));

        assertThat(result.success()).isTrue();
        assertThat(format[0]).isEqualTo("png");
    }

    @Test
    void OCR_호출이_실패하면_예외_없이_success_false() {
        ReceiptOcrResult result = serviceWith(new StubReceiptOcrClient(null)).recognizeReceipt(receipt(JPEG));

        assertThat(result.success()).isFalse();
        assertThat(result.recognizedAmount()).isNull();
    }

    @Test
    void OCR_타임아웃도_success_false() {
        ReceiptOcrClient timeout = (image, fmt) -> {
            throw new ResourceAccessException("Read timed out");
        };

        ReceiptOcrResult result = serviceWith(timeout).recognizeReceipt(receipt(JPEG));

        assertThat(result.success()).isFalse();
        assertThat(result.recognizedAmount()).isNull();
    }

    @Test
    void 총액을_못_찾으면_success_false() {
        ReceiptOcrResult result = serviceWith(new StubReceiptOcrClient("흐릿한 글자 ### 영수증"))
                .recognizeReceipt(receipt(JPEG));

        assertThat(result.success()).isFalse();
        assertThat(result.recognizedAmount()).isNull();
    }

    @Test
    void 빈_파일이면_400() {
        assertThatThrownBy(() -> serviceWith(new StubReceiptOcrClient()).recognizeReceipt(receipt(new byte[0])))
                .isInstanceOf(SettlementException.class)
                .hasMessage("영수증 사진을 선택해주세요.");
    }

    @Test
    void 이미지가_아니면_400_ContentType을_속여도_막는다() {
        MockMultipartFile fake = new MockMultipartFile("receipt", "receipt.jpg", "image/jpeg", "not an image".getBytes());

        assertThatThrownBy(() -> serviceWith(new StubReceiptOcrClient()).recognizeReceipt(fake))
                .isInstanceOf(SettlementException.class)
                .hasMessage("JPG 또는 PNG 사진만 올릴 수 있어요.");
    }

    @Test
    void 용량이_10MB를_넘으면_400() {
        MultipartFile big = mock(MultipartFile.class);
        given(big.isEmpty()).willReturn(false);
        given(big.getSize()).willReturn(SettlementService.MAX_RECEIPT_BYTES + 1);

        assertThatThrownBy(() -> serviceWith(new StubReceiptOcrClient()).recognizeReceipt(big))
                .isInstanceOf(SettlementException.class)
                .hasMessage("사진 용량은 10MB 이하만 올릴 수 있어요.");
    }
}
