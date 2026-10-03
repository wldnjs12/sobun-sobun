package com.ppuri.sobunsobun.settlement.service;

import com.ppuri.sobunsobun.settlement.domain.Settlement;
import com.ppuri.sobunsobun.settlement.domain.SettlementException;
import com.ppuri.sobunsobun.settlement.domain.SettlementRepository;
import com.ppuri.sobunsobun.settlement.dto.ReceiptOcrResult;
import com.ppuri.sobunsobun.settlement.dto.SettlementConfirmRequest;
import com.ppuri.sobunsobun.settlement.dto.SettlementResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementService {

    static final long MAX_RECEIPT_BYTES = 10L * 1024 * 1024; // 10MB

    private final ReceiptOcrClient receiptOcrClient;
    private final PodParticipantCountReader participantCountReader;
    private final SettlementRepository settlementRepository;

    /**
     * 영수증 이미지 → OCR → 총액 추출.
     * 파일 자체가 잘못됐으면(비어 있음/이미지 아님/용량 초과) SettlementException(400)으로 거절하고,
     * 인식 실패(OCR 호출 실패·타임아웃, 총액 못 찾음)는 예외 없이 success=false로 돌려준다 -> 프론트가 수동 입력 폼으로 전환.
     * 영수증 원본은 저장하지 않는다 (MVP).
     */
    public ReceiptOcrResult recognizeReceipt(MultipartFile receipt) {
        byte[] image = readValidImage(receipt);
        String format = detectImageFormat(image);
        if (format == null) {
            throw new SettlementException("JPG 또는 PNG 사진만 올릴 수 있어요.");
        }

        String text;
        try {
            text = receiptOcrClient.recognizeText(image, format);
        } catch (Exception e) {
            // 예외 메시지에 OCR 호출 URL이 섞일 수 있어서 종류(와 HTTP 상태)만 남긴다
            String status = e instanceof RestClientResponseException re ? " status=" + re.getStatusCode().value() : "";
            log.warn("영수증 OCR 호출 실패: {}{}", e.getClass().getSimpleName(), status);
            return new ReceiptOcrResult(null, false);
        }

        Optional<BigDecimal> total = ReceiptAmountExtractor.extractTotal(text);
        if (total.isEmpty()) {
            log.info("영수증 OCR: 총액을 찾지 못함");
            return new ReceiptOcrResult(null, false);
        }
        return new ReceiptOcrResult(total.get(), true);
    }

    /**
     * 대표가 확인(또는 수정)한 원가로 정산 확정.
     * 최종 금액 = 원가 × (1 + 수고비율), 1인당 = 최종 금액 ÷ 확정 참여자 수 (원 단위 올림, PodService 실시간 계산과 같은 방식)
     */
    @Transactional
    public SettlementResponse confirm(Long podId, SettlementConfirmRequest request) {
        BigDecimal cost = request == null ? null : request.recognizedCost();
        BigDecimal rate = request == null ? null : request.commissionRate();
        validateCost(cost);
        validateRate(rate);

        int participantCount = participantCountReader.findParticipantCount(podId)
                .orElseThrow(() -> new SettlementException("팟을 찾을 수 없어요."));
        if (participantCount < 1) {
            throw new SettlementException("참여자가 없는 팟은 정산할 수 없어요.");
        }
        // TODO: 같은 팟 중복 확정 처리 방식 미확정 — 현재는 이미 확정된 팟이면 거절
        if (settlementRepository.existsByPodIdAndConfirmedTrue(podId)) {
            throw new SettlementException("이미 정산이 확정된 팟이에요.");
        }

        BigDecimal exactFinalAmount = calculateFinalAmount(cost, rate);
        BigDecimal perPersonAmount = calculatePerPersonAmount(exactFinalAmount, participantCount);
        BigDecimal finalAmount = exactFinalAmount.setScale(0, RoundingMode.HALF_UP);

        String hostPaymentLink = request.hostPaymentLink();
        Settlement settlement = settlementRepository.save(
                new Settlement(podId, cost, rate, finalAmount, participantCount, perPersonAmount, hostPaymentLink));
        return SettlementResponse.from(settlement);
    }

    /** 정산 결과 화면(12번) 재조회용 — 확정된 정산이 없으면(아직 업로드 전 등) SettlementException(404 아님, 400). */
    public SettlementResponse getByPodId(Long podId) {
        Settlement settlement = settlementRepository.findByPodIdAndConfirmedTrue(podId)
                .orElseThrow(() -> new SettlementException("아직 확정된 정산이 없어요."));
        return SettlementResponse.from(settlement);
    }

    /** 정률 수고비를 반영한 최종 정산 금액 계산. 원가 초과 청구를 시스템적으로 차단한다. */
    public BigDecimal calculateFinalAmount(BigDecimal recognizedCost, BigDecimal commissionRate) {
        return recognizedCost.multiply(BigDecimal.ONE.add(commissionRate));
    }

    /** 1인당 금액: 원 단위로 올림해서 대표가 덜 받는 일이 없게 한다 (차액은 최대 참여자 수 - 1원). */
    public BigDecimal calculatePerPersonAmount(BigDecimal finalAmount, int participantCount) {
        return finalAmount.divide(BigDecimal.valueOf(participantCount), 0, RoundingMode.CEILING);
    }

    private static void validateCost(BigDecimal cost) {
        if (cost == null || cost.signum() <= 0) {
            throw new SettlementException("영수증 금액은 0원보다 커야 해요.");
        }
        if (cost.stripTrailingZeros().scale() > 0) {
            throw new SettlementException("영수증 금액은 원 단위 정수로 입력해주세요.");
        }
    }

    private static void validateRate(BigDecimal rate) {
        if (rate == null || rate.signum() < 0 || rate.compareTo(BigDecimal.ONE) > 0) {
            throw new SettlementException("수고비율은 0%에서 100% 사이여야 해요.");
        }
        // DB 컬럼(numeric 기본 scale 2)에 저장될 때 반올림되지 않도록 1% 단위까지만 받는다 (Pod.commissionRate와 동일)
        if (rate.stripTrailingZeros().scale() > 2) {
            throw new SettlementException("수고비율은 1% 단위로 입력해주세요.");
        }
    }

    private static byte[] readValidImage(MultipartFile receipt) {
        if (receipt == null || receipt.isEmpty()) {
            throw new SettlementException("영수증 사진을 선택해주세요.");
        }
        if (receipt.getSize() > MAX_RECEIPT_BYTES) {
            throw new SettlementException("사진 용량은 10MB 이하만 올릴 수 있어요.");
        }
        try {
            return receipt.getBytes();
        } catch (IOException e) {
            throw new SettlementException("사진을 읽지 못했어요. 다시 올려주세요.");
        }
    }

    /**
     * Content-Type 헤더는 클라이언트가 마음대로 보낼 수 있어서, 파일 앞부분의 시그니처(매직 넘버)로 형식을 판별한다.
     * @return "jpg" / "png", 둘 다 아니면 null
     */
    static String detectImageFormat(byte[] image) {
        if (image.length >= 3 && (image[0] & 0xFF) == 0xFF && (image[1] & 0xFF) == 0xD8 && (image[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (image.length >= 8 && (image[0] & 0xFF) == 0x89 && image[1] == 'P' && image[2] == 'N' && image[3] == 'G'
                && image[4] == 0x0D && image[5] == 0x0A && image[6] == 0x1A && image[7] == 0x0A) {
            return "png";
        }
        return null;
    }
}
