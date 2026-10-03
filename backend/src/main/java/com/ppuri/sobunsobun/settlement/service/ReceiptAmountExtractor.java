package com.ppuri.sobunsobun.settlement.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * OCR 텍스트에서 영수증 총액을 뽑는다.
 * "합계/총액/총금액/결제금액" 키워드가 있는 줄에서 키워드 뒤 숫자를 후보로 모으고
 * (그 줄에 숫자가 없으면 다음 줄 첫 숫자), 후보 중 가장 큰 금액을 총액으로 본다.
 * 영수증에는 "과세물품 합계", "부가세", "합계 수량" 같은 작은 값이 같이 찍혀서, 실제 결제 총액이 보통 가장 크다.
 */
public final class ReceiptAmountExtractor {

    // 영수증은 "합 계"처럼 글자 사이를 띄워 찍는 경우가 많아서 글자 사이 공백을 허용한다
    private static final Pattern KEYWORD = Pattern.compile("결\\s*제\\s*금\\s*액|총\\s*금\\s*액|총\\s*액|합\\s*계");
    // 12,300 처럼 세 자리 쉼표 형식 또는 12300 처럼 붙어 있는 숫자
    private static final Pattern AMOUNT = Pattern.compile("\\d{1,3}(?:,\\d{3})+(?!\\d)|\\d+");

    private ReceiptAmountExtractor() {
    }

    public static Optional<BigDecimal> extractTotal(String ocrText) {
        if (ocrText == null || ocrText.isBlank()) {
            return Optional.empty();
        }
        String[] lines = ocrText.split("\\R");
        List<BigDecimal> candidates = new ArrayList<>();

        for (int i = 0; i < lines.length; i++) {
            Matcher keyword = KEYWORD.matcher(lines[i]);
            while (keyword.find()) {
                List<BigDecimal> amounts = amountsIn(lines[i].substring(keyword.end()));
                if (amounts.isEmpty() && i + 1 < lines.length) {
                    amountsIn(lines[i + 1]).stream().findFirst().ifPresent(amounts::add);
                }
                candidates.addAll(amounts);
            }
        }
        return candidates.stream()
                .filter(amount -> amount.signum() > 0)
                .max(BigDecimal::compareTo);
    }

    private static List<BigDecimal> amountsIn(String text) {
        List<BigDecimal> amounts = new ArrayList<>();
        Matcher m = AMOUNT.matcher(text);
        while (m.find()) {
            amounts.add(new BigDecimal(m.group().replace(",", "")));
        }
        return amounts;
    }
}
