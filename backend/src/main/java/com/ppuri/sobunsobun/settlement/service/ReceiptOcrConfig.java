package com.ppuri.sobunsobun.settlement.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * OCR 키가 설정돼 있으면 Naver 구현체, 없으면 Stub을 쓴다.
 * 키는 application.yml에서 환경변수 NAVER_OCR_INVOKE_URL / NAVER_OCR_SECRET_KEY로 읽거나,
 * local 프로필이면 application-local.yml(gitignore)의 naver.ocr.* 값으로 덮어쓴다.
 */
@Slf4j
@Configuration
public class ReceiptOcrConfig {

    @Bean
    public ReceiptOcrClient receiptOcrClient(@Value("${naver.ocr.invoke-url:}") String invokeUrl,
                                             @Value("${naver.ocr.secret-key:}") String secretKey) {
        if (StringUtils.hasText(invokeUrl) && StringUtils.hasText(secretKey)) {
            log.info("영수증 OCR: Naver Clova OCR(General) 사용");
            return new NaverReceiptOcrClient(invokeUrl, secretKey);
        }
        log.info("영수증 OCR: 키가 없어 Stub 사용 (항상 합계 12,300원으로 인식)");
        return new StubReceiptOcrClient();
    }
}
