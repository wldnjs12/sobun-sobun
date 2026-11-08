package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.PodImage;

import java.util.Base64;

/**
 * 팟 상품 사진 응답. dataUrl("data:image/jpeg;base64,...")을 그대로 &lt;img src&gt;에 넣으면 된다.
 *
 * 왜 이미지 파일 대신 JSON인가: &lt;img src&gt;는 로그인 토큰(Authorization 헤더)을 못 붙여서
 * 같은 건물 확인을 할 수 없다. 그래서 다른 API처럼 토큰을 붙여 JSON(ApiResponse)으로 받는다.
 */
public record PodImageResponse(Long podId, Integer version, String contentType, String dataUrl) {

    public static PodImageResponse of(PodImage image, Integer version) {
        String base64 = Base64.getEncoder().encodeToString(image.getData());
        return new PodImageResponse(image.getPodId(), version, image.getContentType(),
                "data:" + image.getContentType() + ";base64," + base64);
    }
}
