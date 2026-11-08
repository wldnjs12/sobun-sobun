package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.dto.PodImageResponse;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.service.PodImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * 팟 상품 사진 (대표가 올리는 실제 사진, 팟당 1장).
 * 사진이 없는 팟은 프론트가 제목·카테고리로 고른 예시 사진(public/pods)을 대신 보여준다.
 *
 * 요청자는 PodController와 같이 X-User-Id 헤더로 받는다 (로그인 필터가 토큰 주인으로 덮어씀).
 */
@RestController
@RequestMapping("/api/pods/{podId}/image")
@RequiredArgsConstructor
public class PodImageController {

    private static final String USER_ID = "X-User-Id";

    private final PodImageService podImageService;

    /** 사진 등록·교체. multipart 파트 이름은 image. 응답은 imageVersion이 올라간 팟. */
    @PostMapping
    public ApiResponse<PodResponse> upload(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId,
                                           @RequestParam("image") MultipartFile image) {
        return ApiResponse.ok(podImageService.upload(podId, userId, image));
    }

    /** 사진 조회 (같은 건물만). dataUrl을 그대로 <img src>에 넣으면 된다. */
    @GetMapping
    public ApiResponse<PodImageResponse> get(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podImageService.get(podId, userId));
    }

    /** 사진 삭제 → 다시 예시 사진·아이콘으로 보인다. */
    @DeleteMapping
    public ApiResponse<PodResponse> delete(@PathVariable Long podId, @RequestHeader(USER_ID) Long userId) {
        return ApiResponse.ok(podImageService.delete(podId, userId));
    }

    /** multipart에 image 파트가 아예 없을 때 */
    @ExceptionHandler(MissingServletRequestPartException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMissingImage(MissingServletRequestPartException e) {
        return ApiResponse.fail("POD_INVALID", "사진을 선택해주세요.");
    }
}
