# API 명세 초안

베이스 URL: `/api` · 모든 응답은 `{ "success": boolean, "data": ..., "message": string|null }` 형태.

## ① QR+GPS 건물 인증 온보딩 (문소원)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /auth/verify | QR 토큰 + GPS 좌표로 건물 인증 | `{ qrToken, latitude, longitude }` | `boolean` |

## ② 팟 개설·참여·실시간 정산 (지원)

마감 기준은 **목표 인원 도달만** 지원합니다 (목표 금액 방식은 MVP 범위 밖). `deadline`은 화면 표시용이며 기한이 지나도 자동 마감/취소되지 않고, 마감은 대표가 수동으로만 할 수 있습니다.

> ⚠️ **임시 계약**: ①(로그인/세션)이 아직 없어서 `hostUserId`/`userId`를 요청에 직접 받습니다. 세션이 붙으면 이 파라미터들은 세션에서 꺼내는 방식으로 교체될 예정입니다 (`PodController`에 TODO로 표시됨).

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 | `{ buildingId, hostUserId, title, totalAmount, targetParticipantCount, commissionRate?, deadline? }` (commissionRate 생략 시 5%) | `Pod` |
| POST | /pods/{id}/join?userId= | 팟 참여 | - | `Pod` (참여 후 서버가 WebSocket으로 갱신 브로드캐스트) |
| DELETE | /pods/{id}/join?userId= | 팟 참여 취소 (마감 전까지만 가능) | - | `Pod` (취소 후 갱신 브로드캐스트) |
| POST | /pods/{id}/close?hostUserId= | 팟 마감 (대표만 가능, 참여자 0명이면 실패) | - | `Pod` |
| GET | /pods/{id} | 팟 상세 조회 (재연결 시 최신 상태 동기화용) | - | `Pod` |
| WS | /ws-sobun (STOMP) | 실시간 채널 연결 | 구독: `/topic/pods/{id}` | `PodAmountUpdateEvent` |

`Pod` 응답 필드: `{ id, buildingId, hostUserId, title, totalAmount, targetParticipantCount, participantCount, commissionRate, perPersonAmount, deadline, closed }` — `perPersonAmount`는 저장값이 아니라 매 응답 시 재계산되는 값입니다.

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
