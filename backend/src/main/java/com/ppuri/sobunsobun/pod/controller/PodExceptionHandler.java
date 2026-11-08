package com.ppuri.sobunsobun.pod.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.domain.PodRuleViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 팟 API 전용 에러 변환. 전역 핸들러(GlobalExceptionHandler)에 없는 경우만 여기서 처리한다.
 * assignableTypes로 팟 컨트롤러(PodController·PodImageController·PodChatController)에만 적용되게 묶어서 다른 기능(정산·커뮤니티)의 응답에는 영향이 없다.
 *
 * 왜 필요한가: @Valid 검증 실패는 기본적으로 Spring 기본 에러 JSON(ApiResponse 형식 아님)으로 나가서
 * 프론트가 한국어 메시지를 못 꺼낸다. 여기서 첫 번째 검증 메시지를 ApiResponse.fail로 감싸 400으로 돌려준다.
 */
@RestControllerAdvice(assignableTypes = {PodController.class, PodImageController.class, PodChatController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PodExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("입력값을 다시 확인해주세요.");
        return ResponseEntity.badRequest().body(ApiResponse.fail("POD_INVALID", message));
    }

    /** 날짜 형식이 틀렸거나 없는 카테고리 이름을 보낸 경우 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(ApiResponse.fail("POD_INVALID", "입력 형식이 올바르지 않아요. 카테고리·날짜를 다시 확인해주세요."));
    }

    @ExceptionHandler(PodRuleViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleRule(PodRuleViolationException e) {
        return ResponseEntity.badRequest().body(ApiResponse.fail("POD_INVALID", e.getMessage()));
    }

    @ExceptionHandler(PodForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(PodForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.fail("POD_FORBIDDEN", e.getMessage()));
    }

    /** X-User-Id가 없음 = 로그인 안 된 요청 (로그인 필터가 붙으면 그 전에 401로 걸러진다) */
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingUser(MissingRequestHeaderException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.fail("UNAUTHORIZED", "로그인이 필요해요."));
    }
}
