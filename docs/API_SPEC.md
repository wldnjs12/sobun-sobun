# API 명세 초안

베이스 URL: `/api` · 모든 응답은 `{ "success": boolean, "data": ..., "message": string|null }` 형태.
실패 사유별로 프론트가 분기해야 하는 API는 실패 시 `code`(string)를 추가로 내려줍니다 (없으면 JSON에서 생략).

## ① QR+GPS 건물 인증 온보딩 (문소원)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /auth/verify | QR 토큰 + GPS 좌표로 건물 인증 | 헤더: `X-User-Id` (선택) · `{ qrToken, latitude, longitude }` | `boolean` |

- **`X-User-Id` 헤더 (임시)**: 로그인 기능이 없어서 숫자 사용자 id를 헤더로 받습니다. 있으면 인증 성공 시 `BUILDING_AUTH`에 기록(재인증이면 `verified_at`만 갱신), 없으면 판정만 하고 기록하지 않습니다. 로그인 도입 시 제거 예정.
- **실패 응답**: `400` · `{ "success": false, "data": null, "message": "...", "code": "..." }` — `code`로 분기하고 `message`는 화면에 그대로 표시.

| code | message |
| --- | --- |
| `INVALID_QR` | 유효하지 않은 QR이에요. 다시 스캔해주세요. |
| `EXPIRED_QR` | QR이 만료됐어요, 다시 스캔해주세요. |
| `OUT_OF_RANGE` | 건물 근처에서 다시 시도해주세요. |

- 요청 값 검증 실패(`qrToken` 공백, 위도 -90~90·경도 -180~180 밖, 좌표 누락)는 `400` + `code` 없이 `message`만 내려갑니다.
- 자세한 예시: [handoff/qr-auth.md](./handoff/qr-auth.md)

## ② 팟 개설·참여·실시간 정산 (지원)

마감 기준은 **목표 인원 도달만** 지원합니다 (목표 금액 방식은 MVP 범위 밖). `deadline`은 화면 표시용이며 기한이 지나도 자동 마감/취소되지 않고, 마감은 대표가 수동으로만 할 수 있습니다.

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 | `{ buildingId, title, totalAmount, targetParticipantCount, commissionRate, deadline }` | `Pod` |
| POST | /pods/{id}/join | 팟 참여 | - | `Pod` (참여 후 서버가 WebSocket으로 갱신 브로드캐스트) |
| DELETE | /pods/{id}/join | 팟 참여 취소 (마감 전까지만 가능) | - | `Pod` (취소 후 갱신 브로드캐스트) |
| POST | /pods/{id}/close | 팟 마감 (대표만 가능, 참여자 0명이면 실패) | - | `Pod` |
| GET | /pods/{id} | 팟 상세 조회 (재연결 시 최신 상태 동기화용) | - | `Pod` |
| WS | /ws-sobun (STOMP) | 실시간 채널 연결 | 구독: `/topic/pods/{id}` | `PodAmountUpdateEvent` |

## ③ 대표 수고비 정산 (문소원)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /settlements/receipts | 영수증 업로드 → OCR 인식 | multipart: `receipt` | `{ recognizedAmount, success }` |
| POST | /settlements/{podId}/confirm | 정산 확정 | `{ recognizedCost, commissionRate }` | `Settlement` |

## ④ 최저가 조회 (김민준)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /products/search?keyword= | 상품명으로 최저가 검색 | 쿼리: `keyword` | `ProductSearchResult[]` |

---
필요에 따라 Swagger(springdoc-openapi)를 붙이면 이 표를 자동 문서로 대체할 수 있습니다 (`build.gradle`에 `org.springdoc:springdoc-openapi-starter-webmvc-ui` 추가).
