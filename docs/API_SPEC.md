# API 명세 초안

베이스 URL: `/api` · 모든 응답은 `{ "success": boolean, "data": ..., "message": string|null }` 형태.

## ① QR+GPS 건물 인증 온보딩 (문소원)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /auth/verify | QR 토큰 + GPS 좌표로 건물 인증 | `{ qrToken, latitude, longitude }` | `boolean` |

## ② 팟 개설·참여·실시간 정산 (지원)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 | `{ buildingId, title, commissionRate }` | `Pod` |
| POST | /pods/{id}/join | 팟 참여 | - | `Pod` (참여 후 서버가 WebSocket으로 갱신 브로드캐스트) |
| GET | /pods/{id} | 팟 상세 조회 | - | `Pod` |
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
