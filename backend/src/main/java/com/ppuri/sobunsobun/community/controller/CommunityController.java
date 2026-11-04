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
 * 핵심 기능 ⑤: 동네 익명 커뮤니티 (김민준 담당). API 계약: docs/API_SPEC.md ⑤.
 * 입장 전 GPS 확인(purpose=COMMUNITY_ENTER)은 프론트가 ①의 /api/auth/location-check로 먼저 한다.
 *
 * 요청한 사람(userId): X-User-Id 헤더가 있으면 헤더를 쓰고, 없을 때만 예전 방식(?userId=)을 쓴다.
 * 왜: 로그인 필터가 토큰을 확인한 뒤 X-User-Id 헤더를 "토큰 주인"으로 덮어쓰기 때문에, 헤더를 우선하면
 * 쿼리에 남의 userId를 적어 보내도 사칭할 수 없다. 쿼리는 구버전 화면 호환용으로만 남겨 둔다.
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    static final String USER_HEADER = "X-User-Id";

    private final CommunityPostService postService;
    private final CommunityModerationService moderationService;

    /** buildingId는 예전 화면 호환용으로 받기만 하고 쓰지 않는다 — 범위는 서버가 "내 동네(반경 1km)"로 정한다. */
    @GetMapping("/posts")
    public ApiResponse<List<CommunityPostSummary>> list(@RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                                        @RequestParam(required = false) Long userId,
                                                        @RequestParam(required = false) Long buildingId,
                                                        @RequestParam(required = false) CommunityCategory category)
            throws MissingServletRequestParameterException {
        return ApiResponse.ok(postService.list(requester(headerUserId, userId), category));
    }

    @PostMapping("/posts")
    public ApiResponse<CommunityPostDetail> create(@RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                                   @RequestParam(required = false) Long userId,
                                                   @Valid @RequestBody PostCreateRequest request)
            throws MissingServletRequestParameterException {
        return ApiResponse.ok(postService.create(requester(headerUserId, userId), request));
    }

    @GetMapping("/posts/{postId}")
    public ApiResponse<CommunityPostDetail> getDetail(@PathVariable Long postId,
                                                      @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                                      @RequestParam(required = false) Long userId)
            throws MissingServletRequestParameterException {
        return ApiResponse.ok(postService.getDetail(postId, requester(headerUserId, userId)));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> delete(@PathVariable Long postId,
                                    @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                    @RequestParam(required = false) Long userId)
            throws MissingServletRequestParameterException {
        postService.delete(postId, requester(headerUserId, userId));
        return ApiResponse.ok(null);
    }

    @PostMapping("/posts/{postId}/comments")
    public ApiResponse<CommunityPostDetail> addComment(@PathVariable Long postId,
                                                       @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                                       @RequestParam(required = false) Long userId,
                                                       @Valid @RequestBody CommentCreateRequest request)
            throws MissingServletRequestParameterException {
        return ApiResponse.ok(postService.addComment(postId, requester(headerUserId, userId), request));
    }

    @DeleteMapping("/comments/{commentId}")
    public ApiResponse<Void> deleteComment(@PathVariable Long commentId,
                                           @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                           @RequestParam(required = false) Long userId)
            throws MissingServletRequestParameterException {
        postService.deleteComment(commentId, requester(headerUserId, userId));
        return ApiResponse.ok(null);
    }

    @PostMapping("/posts/{postId}/report")
    public ApiResponse<Void> reportPost(@PathVariable Long postId,
                                        @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                        @RequestParam(required = false) Long userId)
            throws MissingServletRequestParameterException {
        moderationService.reportPost(postId, requester(headerUserId, userId));
        return ApiResponse.ok(null);
    }

    @PostMapping("/comments/{commentId}/report")
    public ApiResponse<Void> reportComment(@PathVariable Long commentId,
                                           @RequestHeader(value = USER_HEADER, required = false) Long headerUserId,
                                           @RequestParam(required = false) Long userId)
            throws MissingServletRequestParameterException {
        moderationService.reportComment(commentId, requester(headerUserId, userId));
        return ApiResponse.ok(null);
    }

    /** 헤더 우선, 없으면 쿼리. 둘 다 없으면 400 (아래 handleBadRequest). */
    static Long requester(Long headerUserId, Long queryUserId) throws MissingServletRequestParameterException {
        if (headerUserId != null) return headerUserId;
        if (queryUserId != null) return queryUserId;
        throw new MissingServletRequestParameterException("userId", "Long");
    }

    // 아래 핸들러는 이 컨트롤러에서 난 예외만 처리한다.
    // 404(없는 글)·409(중복 신고 등)·403 BUILDING_ACCESS_DENIED(동네 밖)는 GlobalExceptionHandler가 처리.

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
