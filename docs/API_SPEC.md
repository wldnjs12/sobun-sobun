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

> ⚠️ **임시 계약**: ①(로그인/세션)이 아직 없어서 `hostUserId`/`userId`를 요청에 직접 받습니다. 세션이 붙으면 이 파라미터들은 세션에서 꺼내는 방식으로 교체될 예정입니다 (`PodController`에 TODO로 표시됨).

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 (buildingId가 실존하지 않으면 404) | `{ buildingId, hostUserId, title, totalAmount, targetParticipantCount, commissionRate?, deadline?, originalPrice? }` (commissionRate 생략 시 5%) | `Pod` |
| GET | /pods?buildingId= | 건물의 진행중(미마감)인 팟 목록, 최신순 | 쿼리: buildingId | `Pod[]` |
| POST | /pods/{id}/join?userId= | 팟 참여 | - | `Pod` (참여 후 서버가 WebSocket으로 갱신 브로드캐스트) |
| DELETE | /pods/{id}/join?userId= | 팟 참여 취소 (마감 전까지만 가능) | - | `Pod` (취소 후 갱신 브로드캐스트) |
| POST | /pods/{id}/close?hostUserId= | 팟 마감 (대표만 가능, 참여자 0명이면 실패) | - | `Pod` |
| GET | /pods/{id} | 팟 상세 조회 (재연결 시 최신 상태 동기화용) | - | `Pod` |
| GET | /pods/{id}/me?userId= | 내 참여/송금/수령 상태 + 픽업 PIN (③정산 화면용, 참여 안 했으면 PIN 없음) | - | `MyParticipationResponse` |
| GET | /pods/{id}/participants?hostUserId= | 참여자별 송금/수령 현황 (대표만 조회 가능) | - | `ParticipantStatusResponse[]` |
| POST | /pods/{id}/paid?userId= | "보냈어요" 자가 신고 (실제 결제 연동 없음) | - | `MyParticipationResponse` |
| POST | /pods/{id}/picked-up?userId= | "수령 완료" 자가 신고 | - | `MyParticipationResponse` |
| WS | /ws-sobun (STOMP) | 실시간 채널 연결 | 구독: `/topic/pods/{id}` | `PodAmountUpdateEvent` |

`Pod` 응답 필드: `{ id, buildingId, hostUserId, title, totalAmount, targetParticipantCount, participantCount, commissionRate, perPersonAmount, deadline, closed, originalPrice }` — `perPersonAmount`는 저장값이 아니라 매 응답 시 재계산되는 값입니다. `originalPrice`(혼자 샀을 때 가격, 선택)는 ③ 정산 결과 화면의 절약액 카드에만 쓰이고 없으면(null) 그 카드를 생략합니다. `pickupPin`(4자리, 생성 시 자동 발급)은 비참여자에게 노출되면 안 돼서 `Pod` 응답엔 없고 `MyParticipationResponse`에만 있습니다.

`PodAmountUpdateEvent` 필드: `{ podId, participantCount, perPersonAmount, closed }`.

`MyParticipationResponse` 필드: `{ joined, paid, pickedUp, pickupPin }`. `ParticipantStatusResponse` 필드: `{ userId, paid, pickedUp }`.

## ③ 대표 수고비 정산 (문소원)

> ⚠️ 지원이 ②(팟) 연동 과정에서 `GET /settlements/{podId}`와 `hostPaymentLink` 필드를 추가했습니다. 문소원님 확인 부탁드려요 — [handoff/settlement-screens.md](./handoff/settlement-screens.md) 참고.

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /settlements/receipts | 영수증 업로드 → OCR 인식 (JPG/PNG, 10MB 이하) | multipart: `receipt` (파일) | `{ recognizedAmount, success }` |
| POST | /settlements/{podId}/confirm | 정산 확정 (팟당 1회) | `{ recognizedCost, commissionRate, hostPaymentLink? }` (원가: 원 단위 정수, 수고비율: 0~1, 0.01 단위) | `Settlement` |
| GET | /settlements/{podId} | 확정된 정산 결과 재조회 (참여자/새로고침 대응, 미확정이면 400) | - | `Settlement` |

- **OCR 인식 실패는 에러가 아닙니다**: OCR 호출 실패·타임아웃·총액을 못 찾은 경우 모두 `200` · `{ "success": true, "data": { "recognizedAmount": null, "success": false }, "message": null }` → 프론트는 `data.success`로 수동 입력 폼 전환.
- `Settlement` 응답 필드: `{ id, podId, receiptImageUrl, recognizedCost, commissionRate, finalAmount, participantCount, perPersonAmount, confirmed, hostPaymentLink }` — `finalAmount = recognizedCost × (1 + commissionRate)` (원 단위 반올림), `perPersonAmount = finalAmount ÷ participantCount` (원 단위 올림), `participantCount`는 확정 시점 `Pod.participantCount` 스냅샷, `receiptImageUrl`은 현재 항상 `null`. `hostPaymentLink`(선택)는 대표가 본인 카카오페이 "받을 링크"나 계좌번호를 직접 붙여넣는 텍스트 — 실제 결제 API 연동이 아닙니다.
- **거절 응답**: `400` · `{ "success": false, "data": null, "message": "..." }` (`code` 없음, `message`를 화면에 그대로 표시)

| API | 조건 | message |
| --- | --- | --- |
| receipts | `receipt` 파트 누락 또는 빈 파일 | 영수증 사진을 선택해주세요. |
| receipts | JPG/PNG 아님 (파일 시그니처로 판별) | JPG 또는 PNG 사진만 올릴 수 있어요. |
| receipts | 10MB 초과 | 사진 용량은 10MB 이하만 올릴 수 있어요. |
| confirm | 원가 누락·0 이하 | 영수증 금액은 0원보다 커야 해요. |
| confirm | 원가에 소수점 | 영수증 금액은 원 단위 정수로 입력해주세요. |
| confirm | 수고비율 누락·0~1 밖 | 수고비율은 0%에서 100% 사이여야 해요. |
| confirm | 수고비율이 0.01 단위 아님 | 수고비율은 1% 단위로 입력해주세요. |
| confirm | 없는 팟 (404 아님) | 팟을 찾을 수 없어요. |
| confirm | 참여자 0명 | 참여자가 없는 팟은 정산할 수 없어요. |
| confirm | 이미 확정된 팟 | 이미 정산이 확정된 팟이에요. |
| GET | 아직 확정된 정산이 없는 podId | 아직 확정된 정산이 없어요. |

- JSON 형식이 깨졌거나 업로드가 15MB(multipart 한도)를 넘으면 공통 응답 래퍼가 아닌 Spring 기본 에러가 내려옵니다.
- 자세한 예시: [handoff/settlement.md](./handoff/settlement.md)

## ④ 최저가 조회 (김민준)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /products/search?keyword= | 상품명으로 최저가 검색 | 쿼리: `keyword` | `ProductSearchResult[]` |

---
필요에 따라 Swagger(springdoc-openapi)를 붙이면 이 표를 자동 문서로 대체할 수 있습니다 (`build.gradle`에 `org.springdoc:springdoc-openapi-starter-webmvc-ui` 추가).
