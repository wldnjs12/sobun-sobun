# API 명세 초안

베이스 URL: `/api` · 모든 응답은 `{ "success": boolean, "data": ..., "message": string|null }` 형태.
실패 사유별로 프론트가 분기해야 하는 API는 실패 시 `code`(string)를 추가로 내려줍니다 (없으면 JSON에서 생략).

> ⚠️ **기획 개편(2026-10-03)**: QR 인증과 최저가 조회(④)를 삭제하고, 주소+GPS 인증과 커뮤니티(⑤)를 새로 추가했습니다. 이 문서는 새 계약을 기준으로 작성됐고, 실제 코드는 담당자별로 순서대로 반영됩니다 — 진행 상황은 [REPLAN_WORK_ASSIGNMENT.md](./REPLAN_WORK_ASSIGNMENT.md) 참고. 과거 QR 계약은 [handoff/qr-auth.md](./handoff/qr-auth.md)에 기록으로만 남아있습니다.

## ① 주소+GPS 건물 인증 온보딩 (최지원 — 백엔드 / 도우현 — 프론트)

1차(주소, 가입 시 1회) + 2차(GPS, 행동 직전마다)로 나뉩니다. QR은 쓰지 않습니다.

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /auth/addresses/search?keyword= | 주소 후보 검색 (도로명주소 API 프록시) | 쿼리: keyword | `AddressCandidate[]` |
| POST | /auth/buildings/register | 건물 확정 등록 (find-or-create) + 내 건물 소속 저장 | 헤더: `X-User-Id` · `{ roadAddress, bdMgtSn, buildingName, dong? }` | `{ buildingId, name, dong }` |
| POST | /auth/location-check | GPS 2차 확인 (행동 직전마다 호출, 캐시 없음) | 헤더: `X-User-Id`(필수) · `{ latitude, longitude, purpose }` (`purpose`: `POD_CREATE`\|`POD_JOIN`\|`COMMUNITY_ENTER`) | `boolean` |

- **`AddressCandidate`**: `{ roadAddress, buildingName, bdMgtSn, isApartment, dongOptions: string[] }` — `isApartment=false`면 `dongOptions`는 빈 배열. API가 동 목록을 안 주면 프론트가 직접입력 폼으로 폴백.
- **`buildingKey`(서버 내부)**: 빌라/원룸은 `bdMgtSn`, 아파트는 `bdMgtSn + 동`으로 건물을 구분합니다. 같은 키를 가진 사용자끼리만 같은 건물 방에 들어갑니다.
- **GPS 허용 반경**: 100m(임시값, [open-decisions.md](./open-decisions.md) 참고). 거리 계산은 Haversine 공식, **반드시 서버에서 판정**합니다.
- **데모 고정 좌표 모드**: 서버 환경변수(`LOCATION_CHECK_DEMO_MODE=true` 등)로만 켜짐, 기본 꺼짐. 운영/기본 환경에서는 항상 꺼져 있어야 합니다.
- **위치 개인정보**: 제출된 원본 좌표(`latitude`/`longitude`)는 저장하지 않습니다. 판정 결과(성공/실패, 시각, 목적)만 `LOCATION_CHECK` 테이블에 남습니다.
- **실패 응답**: `400` · `{ "success": false, "data": null, "message": "...", "code": "OUT_OF_RANGE" }`. 위치 권한 거부·타임아웃은 서버까지 오지 않고 **프론트에서 브라우저 Geolocation 에러로 처리**합니다(아래 표의 (b)(c)).

| 상황 | 주체 | 문구 |
| --- | --- | --- |
| (a) 반경 밖 | 서버 (`OUT_OF_RANGE`) | 지금 위치가 등록한 건물({건물명})과 달라요. 집에 돌아가서 다시 시도해 주세요. |
| (b) 위치 권한 거부 | 프론트 (Geolocation code 1) | 이웃 확인을 위해 위치 권한이 필요해요. |
| (c) 위치 못 받음(타임아웃/신호 약함) | 프론트 (Geolocation code 2/3) | 위치를 확인하지 못했어요. 창가나 건물 입구 근처에서 다시 시도해 주세요. |

- 세 경우 모두 해당 행동(팟 개설·참여·커뮤니티 입장)은 진행하지 않습니다. 팟 목록 조회 등은 1차 인증(건물 등록)만으로 허용됩니다.

## ② 팟 개설·참여·실시간 정산 (최지원)

마감 기준은 **목표 인원 도달만** 지원합니다. `deadline`은 화면 표시용이며 자동 마감/취소되지 않습니다.

> ⚠️ **건물 소속 검증 추가 (기획 개편)**: 아래 전체 엔드포인트에 `userId`(요청자) 소속 건물이 해당 `Pod.buildingId`와 같은지 검증이 추가됩니다. 다르면 **403** + `{ success:false, code:"BUILDING_ACCESS_DENIED", message:"다른 건물의 팟에는 접근할 수 없어요." }`. `GET /pods?buildingId=`도 요청자가 그 건물 소속인지 확인합니다(다른 건물 목록을 buildingId로 직접 조회하는 것 방지).

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 (buildingId가 실존하지 않으면 404, hostUserId가 그 건물 소속 아니면 403) | `{ buildingId, hostUserId, title, totalAmount, targetParticipantCount, commissionRate?, deadline?, originalPrice? }` | `Pod` |
| GET | /pods?buildingId=&userId= | 건물의 진행중 팟 목록 | 쿼리: buildingId, userId(소속 확인용) | `Pod[]` |
| POST | /pods/{id}/join?userId= | 팟 참여 (건물 소속 아니면 403) | - | `Pod` |
| DELETE | /pods/{id}/join?userId= | 팟 참여 취소 | - | `Pod` |
| POST | /pods/{id}/close?hostUserId= | 팟 마감 (대표만) | - | `Pod` |
| GET | /pods/{id}?userId= | 팟 상세 조회 (건물 소속 아니면 403) | - | `Pod` |
| GET | /pods/{id}/me?userId= | 내 참여/송금/수령 상태 + 픽업 PIN | - | `MyParticipationResponse` |
| GET | /pods/{id}/participants?hostUserId= | 참여자별 송금/수령 현황 (대표만) | - | `ParticipantStatusResponse[]` |
| POST | /pods/{id}/paid?userId= | "보냈어요" 자가 신고 | - | `MyParticipationResponse` |
| POST | /pods/{id}/picked-up?userId= | "수령 완료" 자가 신고 | - | `MyParticipationResponse` |
| WS | /ws-sobun (STOMP) | 실시간 채널. `connectHeaders`에 `X-User-Id` 필수 | 구독: `/topic/pods/{id}` (다른 건물이면 서버가 구독 거부) | `PodAmountUpdateEvent` |

응답 필드는 기존과 동일(`Pod`, `PodAmountUpdateEvent`, `MyParticipationResponse`, `ParticipantStatusResponse`) — 변경 없음.

## ③ 대표 수고비 정산 (문소원)

> ⚠️ **건물 소속 검증 추가**: `confirm`/`getConfirmed`에 `userId` 쿼리파라미터가 추가되고, 요청자가 해당 팟의 건물 소속인지 확인합니다(불일치 시 403). 그 외 계약은 기존과 동일합니다.

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /settlements/receipts | 영수증 업로드 → OCR 인식 | multipart: `receipt` | `{ recognizedAmount, success }` |
| POST | /settlements/{podId}/confirm?userId= | 정산 확정 (대표만, 건물 소속 확인) | `{ recognizedCost, commissionRate, hostPaymentLink? }` | `Settlement` |
| GET | /settlements/{podId}?userId= | 확정된 정산 결과 조회 (건물 소속 확인) | - | `Settlement` 또는 `null` |

나머지 세부 규칙(OCR 실패 처리, 금액 계산, 에러 메시지 표)은 기존과 동일 — [handoff/settlement.md](./handoff/settlement.md) 참고.

## ④ ~~최저가 조회~~ — 삭제됨

기획 개편으로 완전히 제거되었습니다. `product` 패키지·`ProductListPage`는 삭제 대상입니다. 과거 계약은 Git 히스토리로만 남습니다.

## ⑤ 건물별 익명 커뮤니티 (김민준, 신규)

건물 방마다 따로 있고, 같은 건물 주민만 볼 수 있습니다. 입장 시 ①의 GPS 확인(`purpose=COMMUNITY_ENTER`)을 먼저 통과해야 합니다.

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /community/posts?buildingId=&userId=&category= | 글 목록 (건물 소속 확인, 숨김글 제외) | 쿼리: buildingId, userId, category? | `CommunityPostSummary[]` |
| POST | /community/posts?userId= | 글 작성 | `{ category, content }` | `CommunityPostDetail` |
| GET | /community/posts/{id}?userId= | 글 상세 + 댓글 | - | `CommunityPostDetail` |
| DELETE | /community/posts/{id}?userId= | 글 삭제 (본인만) | - | - |
| POST | /community/posts/{id}/comments?userId= | 댓글 작성 | `{ content }` | `CommunityPostDetail` |
| DELETE | /community/comments/{id}?userId= | 댓글 삭제 (본인만) | - | - |
| POST | /community/posts/{id}/report?userId= | 글 신고 | - | - |
| POST | /community/comments/{id}/report?userId= | 댓글 신고 | - | - |

- **익명화**: 글쓴이는 응답에서 항상 `"글쓴이"`, 그 외 작성자는 그 글 안에서 처음 등장한 순서대로 `"이웃 1"`, `"이웃 2"`... 로 표시됩니다. 실제 `authorUserId`는 절대 응답에 포함되지 않고, 신고 처리용으로만 서버 내부에 보관됩니다(이용 안내에 고지).
- **`CommunityCategory`**: `FREE`(자유) / `QUESTION`(질문) / `SHARE`(나눔) / `GROUP_BUY_SUGGESTION`(공구 제안) — 임시 목록, [open-decisions.md](./open-decisions.md) 참고.
- **`CommunityPostDetail`**에 `suggestable: boolean`(category가 `GROUP_BUY_SUGGESTION`이면 true) — true면 프론트가 "이 품목으로 팟 열기" 버튼을 보여주고 `/pods/new`로 이동(이동 시 GPS 재확인).
- **신고 자동숨김**: 신고 누적 3회(임시값) 이상이면 서버가 자동으로 `hidden=true` 처리, 목록/상세에서 제외.
- 건물 소속이 아니면 전체 엔드포인트 403.

---
필요에 따라 Swagger(springdoc-openapi)를 붙이면 이 표를 자동 문서로 대체할 수 있습니다.
