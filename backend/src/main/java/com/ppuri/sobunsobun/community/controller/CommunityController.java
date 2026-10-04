package com.ppuri.sobunsobun.community.controller;

import com.ppuri.sobunsobun.community.domain.CommunityCategory;
import com.ppuri.sobunsobun.community.dto.CommentCreateRequest;
import com.ppuri.sobunsobun.community.dto.CommunityPostDetail;
import com.ppuri.sobunsobun.community.dto.CommunityPostSummary;
import com.ppuri.sobunsobun.community.dto.PostCreateRequest;
import com.ppuri.sobunsobun.community.service.CommunityForbiddenException;
import com.ppuri.sobunsobun.community.service.CommunityModerationService;
import com.ppuri.sobunsobun.community.service.CommunityPostService;
import com.ppuri.sobunsobun.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 핵심 기능 ⑤: 건물별 익명 커뮤니티 (김민준 담당). API 계약: docs/API_SPEC.md ⑤.
 * 입장 전 GPS 확인(purpose=COMMUNITY_ENTER)은 프론트가 ①의 /api/auth/location-check로 먼저 한다.
 */
// TODO(①온보딩 연동 전 임시): 실제 로그인 세션이 생기면 userId는 세션에서 꺼내도록 교체 (팟 API와 동일한 방식)
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityPostService postService;
    private final CommunityModerationService moderationService;

    @GetMapping("/posts")
    public ApiResponse<List<CommunityPostSummary>> list(@RequestParam Long buildingId,
                                                        @RequestParam Long userId,
                                                        @RequestParam(required = false) CommunityCategory category) {
        return ApiResponse.ok(postService.list(buildingId, userId, category));
    }

    @PostMapping("/posts")
    public ApiResponse<CommunityPostDetail> create(@RequestParam Long userId,
                                                   @Valid @RequestBody PostCreateRequest request) {
        return ApiResponse.ok(postService.create(userId, request));
    }

    @GetMapping("/posts/{postId}")
    public ApiResponse<CommunityPostDetail> getDetail(@PathVariable Long postId, @RequestParam Long userId) {
        return ApiResponse.ok(postService.getDetail(postId, userId));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> delete(@PathVariable Long postId, @RequestParam Long userId) {
        postService.delete(postId, userId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/posts/{postId}/comments")
    public ApiResponse<CommunityPostDetail> addComment(@PathVariable Long postId,
                                                       @RequestParam Long userId,
                                                       @Valid @RequestBody CommentCreateRequest request) {
        return ApiResponse.ok(postService.addComment(postId, userId, request));
    }

    @DeleteMapping("/comments/{commentId}")
    public ApiResponse<Void> deleteComment(@PathVariable Long commentId, @RequestParam Long userId) {
        postService.deleteComment(commentId, userId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/posts/{postId}/report")
    public ApiResponse<Void> reportPost(@PathVariable Long postId, @RequestParam Long userId) {
        moderationService.reportPost(postId, userId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/comments/{commentId}/report")
    public ApiResponse<Void> reportComment(@PathVariable Long commentId, @RequestParam Long userId) {
        moderationService.reportComment(commentId, userId);
        return ApiResponse.ok(null);
    }

    // 아래 핸들러는 이 컨트롤러에서 난 예외만 처리한다.
    // 404(없는 글)·409(중복 신고 등)·403 BUILDING_ACCESS_DENIED(다른 건물)는 GlobalExceptionHandler가 처리.

    @ExceptionHandler(CommunityForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleForbidden(CommunityForbiddenException e) {
        return ApiResponse.fail(e.getMessage());
    }

    /** 내용이 비었거나 너무 김, 카테고리·userId 값이 없거나 잘못됨 → 400 (기본 Spring 에러 대신 우리 응답 형식으로). */
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleBadRequest(Exception e) {
        return ApiResponse.fail("입력값을 확인해주세요. (내용은 비울 수 없고, 글은 2000자·댓글은 500자까지)");
    }
}
