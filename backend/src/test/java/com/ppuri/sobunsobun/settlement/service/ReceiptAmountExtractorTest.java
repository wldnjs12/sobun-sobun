package com.ppuri.sobunsobun.settlement.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReceiptAmountExtractorTest {

    @Test
    void 합계_쉼표_형식() {
        assertThat(ReceiptAmountExtractor.extractTotal("합계 12,300")).hasValueSatisfying(
                amount -> assertThat(amount).isEqualByComparingTo("12300"));
    }

    @Test
    void 총액_콜론과_원_단위() {
        assertThat(ReceiptAmountExtractor.extractTotal("총액: 12300원")).hasValueSatisfying(
                amount -> assertThat(amount).isEqualByComparingTo("12300"));
    }

    @Test
    void 총액_키워드가_여러_번_나오면_가장_큰_금액() {
        String receipt = """
                과세물품 합계 11,182
                부가세 1,118
                합 계 수량 3 12,300
                결제금액 12,300
                """;

        assertThat(ReceiptAmountExtractor.extractTotal(receipt)).hasValueSatisfying(
                amount -> assertThat(amount).isEqualByComparingTo("12300"));
    }

    @Test
    void 키워드_다음_줄에_금액이_있는_경우() {
        String receipt = """
                결제금액
                45,800원
                """;

        assertThat(ReceiptAmountExtractor.extractTotal(receipt)).hasValueSatisfying(
                amount -> assertThat(amount).isEqualByComparingTo("45800"));
    }

    @Test
    void 키워드_없는_숫자는_무시() {
        assertThat(ReceiptAmountExtractor.extractTotal("양파 5kg 8,900\n대파 3,400")).isEmpty();
    }

    @Test
    void 숫자를_못_찾으면_빈_값() {
        assertThat(ReceiptAmountExtractor.extractTotal("합계 ###")).isEmpty();
        assertThat(ReceiptAmountExtractor.extractTotal("")).isEmpty();
        assertThat(ReceiptAmountExtractor.extractTotal(null)).isEmpty();
    }
}
