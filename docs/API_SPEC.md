# API 명세

베이스 URL: `/api` · 모든 응답은 `{ "success": boolean, "data": ..., "message": string|null }` 형태(`ApiResponse<T>`).
실패 사유별로 프론트가 분기해야 하는 API는 실패 시 `code`(string)를 추가로 내려줍니다 (없으면 JSON에서 생략).

> **2026-11 개편**: 계정(로그인) 추가, 주소 검색 페이지·지번·상세주소, 팟 카테고리·미개봉 단위 필드·수정/취소/검색, 품목에 밀봉 가공식품 카테고리 추가. 범위는 기존과 같이 **건물 단위 격리**입니다. **(2026-11 개편)** 표시가 붙은 부분은 새 계약이며, 정확한 필드 이름은 통합 시점에 최종 확정될 수 있습니다. 제품 규칙 전체는 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).

## 공통 규칙

| 상황 | HTTP | code | 비고 |
| --- | --- | --- | --- |
| 토큰 없음/만료/잘못됨 (인증 필요 경로) | 401 | `UNAUTHORIZED` | (2026-11 개편) |
| 다른 건물·건물 미등록 상태로 리소스 접근 (ID 직접 접근 포함) | 403 | `BUILDING_ACCESS_DENIED` | 기존 code 그대로 사용 |
| GPS 반경 밖 / 최근 위치 확인 없음 | 400 | `OUT_OF_RANGE` / `LOCATION_CHECK_REQUIRED` | |
| 없는 리소스 | 404 | - | `IllegalArgumentException` |
| 상태 충돌(이미 마감, 이미 참여, 인원 가득 등) | 409 | - | `IllegalStateException` |
| 입력 검증 실패 | 400 | - | 첫 번째 에러 문구만 `message`로 |

### 인증 헤더 (2026-11 개편)

- 로그인 후 모든 요청에 `Authorization: Bearer <token>`을 붙입니다. 프론트는 `src/api/client.js`에서 자동으로 붙입니다.
- 서버 필터가 토큰을 검증한 뒤 **요청의 `X-User-Id` 헤더를 토큰의 userId로 강제로 덮어씁니다.** 클라이언트가 보낸 `X-User-Id`는 무시됩니다. 그래서 기존 컨트롤러의 `@RequestHeader("X-User-Id")` 코드는 그대로 동작합니다.
- 기존에 쿼리로 받던 `userId`/`hostUserId`(`?userId=`)도 토큰의 userId로 대체됩니다(통합 시 확정).
- 공개 경로(토큰 불필요): `POST /account/signup`, `POST /account/login`, `GET /auth/addresses/search`, 헬스체크, WebSocket 핸드셰이크(`/ws-sobun`, 기존 동작 유지).

## ⓪ 계정 (2026-11 개편)

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /account/signup | 회원가입 + 바로 로그인 | `{ loginId, password, nickname }` | `{ token, userId, loginId, nickname }` |
| POST | /account/login | 로그인 | `{ loginId, password }` | `{ token, userId, loginId, nickname }` |
| GET | /account/me | 내 계정 + 내 건물 | 헤더: Authorization | `AccountMe` |
| DELETE | /account/session | 로그아웃(현재 토큰 삭제) | 헤더: Authorization | `null` |

- 검증: `loginId` 영문 소문자·숫자 4~20자, `password` 8자 이상, `nickname` 2~10자. 아이디 중복 → 409 "이미 쓰고 있는 아이디예요".
- 로그인 실패 → 401 "아이디 또는 비밀번호가 맞지 않아요" (어느 쪽이 틀렸는지 구분하지 않음).
- 비밀번호는 BCrypt 해시로 저장(`spring-security-crypto`만 사용). 토큰은 랜덤 opaque 문자열이고 DB(`session_tokens`)에는 해시로 저장, 30일 만료.
- **`AccountMe`**:
  ```json
  {
    "userId": 7, "loginId": "jimin01", "nickname": "지민",
    "building": {
      "buildingId": 3, "buildingName": "인하로67번길 3",
      "roadAddress": "인천광역시 미추홀구 인하로67번길 3 (용현동)",
      "dong": null, "detailAddress": "302호", "neighborhoodName": "용현동"
    }
  }
  ```
  건물 등록 전이면 `"building": null` → 프론트는 주소 검색 화면으로 보냅니다. 상세주소·도로명주소는 **본인 응답에만** 들어갑니다. `neighborhoodName`은 도로명주소 괄호의 법정동(본인 화면 표시용).

## ① 주소+GPS 건물 인증

1차(주소, 가입 후 1회) + 2차(GPS, 행동 직전마다).

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /auth/addresses/search?keyword=&page= | 주소 후보 검색 (도로명주소 API 프록시) | 쿼리: keyword, page(1부터, 기본 1) | `AddressSearchPage` |
| POST | /auth/buildings/register | 건물 확정 등록 (find-or-create) + 내 건물 소속 저장 | `{ roadAddress, jibunAddress?, bdMgtSn, buildingName?, dong?, detailAddress? }` | `{ buildingId, name, dong }` |
| POST | /auth/location-check | GPS 2차 확인 (행동 직전마다, 캐시 없음) | `{ latitude, longitude, purpose }` (`POD_CREATE`\|`POD_JOIN`\|`COMMUNITY_ENTER`) | `boolean` |

### 주소 검색 페이지 (2026-11 개편)

- **`AddressSearchPage`**: `{ items: AddressCandidate[], totalCount, page, hasMore }` — 한 페이지 20건. `hasMore=true`면 프론트가 [더 보기]로 `page+1`을 요청합니다. (기존 응답은 `AddressCandidate[]` 1페이지 고정이었음)
- **`AddressCandidate`**: `{ roadAddress, jibunAddress, buildingName, displayName, bdMgtSn, isApartment, dongOptions: string[] }`
  - `buildingName`: Juso `bdNm`. **빈 문자열일 수 있음**(빌라·주택).
  - `displayName`: 화면에 크게 보여줄 이름. 건물명이 있으면 건물명, 없으면 "도로명 + 건물번호"(예: "인하로67번길 3").
  - `isApartment=false`면 `dongOptions`는 빈 배열. 아파트인데 목록이 비면 프론트가 직접입력으로 폴백.
- Juso는 장소명이 아니라 주소 검색이라 "인하로 100"처럼 도로명+건물번호가 정확하면 1건만 나오는 게 정상입니다.

### 건물 등록 (2026-11 개편)

- `buildingName`은 **선택값**(기존 `@NotBlank` 제거). 비어 있으면 서버가 `displayName` 규칙으로 이름을 채웁니다.
- `detailAddress`(동·호수 등, 선택)는 본인 정보로만 저장되고 **본인 `/account/me`에만** 나갑니다. 다른 사용자 응답에는 절대 넣지 않습니다.
- **`buildingKey`(서버 내부)**: 빌라/원룸은 `bdMgtSn`, 아파트는 `bdMgtSn + ":" + 동`. 상세주소는 키에 쓰지 않습니다.
- 다시 등록하면(이사) 소속 건물만 바뀝니다.

### GPS 2차 확인

- **허용 반경**: 내 건물 좌표에서 기본 700m( `location-check.allowed-radius-meters`, 환경변수 `LOCATION_CHECK_RADIUS_METERS`). Haversine 공식, **반드시 서버에서 판정**.
- **데모 고정 좌표 모드**: 서버 환경변수 `LOCATION_CHECK_DEMO_MODE=true`로만 켜짐, 기본 꺼짐.
- **위치 개인정보**: 원본 좌표는 저장하지 않고 판정 결과(성공/실패, 시각, 목적)만 `LOCATION_CHECK`에 남깁니다.
- **실패 응답**: `400` · `code: "OUT_OF_RANGE"`. 위치 권한 거부·타임아웃은 서버까지 오지 않고 프론트에서 처리합니다.
- **서버 강제**: 팟 개설·참여는 "최근 3분 안에 같은 목적으로 통과" 기록이 없으면 `400` · `code: "LOCATION_CHECK_REQUIRED"`. 대표의 개설 직후 자동 참여는 면제. 커뮤니티 입장은 조회라 서버 강제 대상이 아닙니다.

| 상황 | 주체 | 문구 |
| --- | --- | --- |
| (a) 반경 밖 | 서버 (`OUT_OF_RANGE`) | 지금 위치가 등록한 건물({건물명})과 달라요. 집에 돌아가서 다시 시도해 주세요. |
| (b) 위치 권한 거부 | 프론트 (Geolocation code 1) | 이웃 확인을 위해 위치 권한이 필요해요. |
| (c) 위치 못 받음 | 프론트 (Geolocation code 2/3) | 위치를 확인하지 못했어요. 창가나 건물 입구 근처에서 다시 시도해 주세요. |

## ② 팟 개설·참여·실시간 정산

### 건물 단위 격리

- 팟 목록·상세·참여·마감·참여 현황, WebSocket 구독은 **같은 건물 소속**만 가능합니다. 가드는 `BuildingAccessService.requireMembership(userId, pod.buildingId)` — 다르면 403 `BUILDING_ACCESS_DENIED`, message "다른 건물의 팟에는 접근할 수 없어요." ID를 알고 직접 호출해도 같습니다.
- 다른 사용자에게 보이는 위치 정보는 건물 이름(+아파트 동)까지입니다. 도로명주소·지번·상세주소·좌표는 팟 응답에 넣지 않습니다.

### 엔드포인트

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /pods | 팟 개설 (최근 `POD_CREATE` 위치 확인 필요) | `PodCreateRequest` | `Pod` |
| GET | /pods?keyword=&category= | **(2026-11 개편)** 우리 건물의 모집 중 팟 목록, 최신순 | 쿼리: keyword?(제목·설명), category?(`PodCategory`) | `Pod[]` |
| GET | /pods/{id} | 팟 상세 (다른 건물이면 403) | - | `Pod` |
| PATCH | /pods/{id} | **(2026-11 개편)** 팟 수정 — 대표만, 대표 외 참여자가 없을 때만 | `PodCreateRequest`와 같은 필드 | `Pod` |
| POST | /pods/{id}/cancel | **(2026-11 개편)** 팟 취소 — 대표만, 마감 전 | - | `Pod` |
| POST | /pods/{id}/join | 참여 (대표가 아니면 최근 `POD_JOIN` 위치 확인 필요) | - | `Pod` |
| DELETE | /pods/{id}/join | 참여 취소 (마감 전) | - | `Pod` |
| POST | /pods/{id}/close | 모집 마감 (대표만, 참여자 1명 이상) | - | `Pod` |
| GET | /pods/{id}/me | 내 참여/송금/수령 상태 (+ `pickupPin`: 호환용, 화면에서 안 씀 — PRODUCT_SPEC D27) | - | `MyParticipationResponse` |
| GET | /pods/{id}/participants | 참여자별 송금/수령 현황 (대표만) | - | `ParticipantStatusResponse[]` |
| POST | /pods/{id}/paid | "보냈어요" 자가 신고 | - | `MyParticipationResponse` |
| POST | /pods/{id}/picked-up | "수령 완료" 자가 신고 | - | `MyParticipationResponse` |
| POST | /pods/{id}/image | **(2026-11-08)** 상품 사진 등록·교체 — 수정과 같은 조건(대표 + 모집중 + 대표 외 참여자 없음) | multipart: `image` (JPG/PNG/WEBP, 2MB 이하) | `Pod` (`imageVersion` +1) |
| GET | /pods/{id}/image | **(2026-11-08)** 상품 사진 조회 (다른 건물이면 403, 사진 없으면 404) | - | `{ podId, version, contentType, dataUrl }` |
| DELETE | /pods/{id}/image | **(2026-11-08)** 상품 사진 삭제 — 등록과 같은 조건 | - | `Pod` (`imageVersion` null) |
| WS | /ws-sobun (STOMP) | 실시간 채널. `connectHeaders`에 `X-User-Id` | 구독: `/topic/pods/{id}` (다른 건물이면 구독 거부) | `PodAmountUpdateEvent` |
| GET | /pods/{id}/messages?after= | **(2026-11-08)** 참여자 채팅 이전 메시지(보낸 순서). `after`(메시지 id)를 주면 그보다 새 것만 — 대표·참여자만, 아니면 403 `POD_FORBIDDEN` | - | `{ myLabel, messages: ChatMessage[] }` |
| POST | /pods/{id}/messages | **(2026-11-08)** 채팅 보내기 — 대표·참여자만(403), 빈 메시지·500자 초과는 400. 저장 후 `/topic/pods/{id}/chat`으로 방송 | `{ content }` | `ChatMessage` |
| WS | 구독 `/topic/pods/{id}/chat` | **(2026-11-08)** 새 채팅 메시지 실시간 수신. 그 팟의 대표·참여자가 아니면 구독 거부 | - | `ChatMessage` |

- 기존 `GET /pods?buildingId=&userId=`에 `keyword`·`category`가 추가됩니다. 요청자의 건물은 서버가 토큰 사용자 기준으로 확인하며, `buildingId` 쿼리가 남을지는 통합 시 확정(남더라도 내 건물이 아니면 403).
- 채팅 `ChatMessage` = `{ id, podId, senderLabel, content, createdAt }`. 보낸 사람은 `senderLabel`("대표" / "이웃 N", 이웃 번호는 채팅에서 처음 말한 순서)로만 알려주고 userId·닉네임은 넣지 않습니다(PRODUCT_SPEC D24). `myLabel`은 내 라벨(아직 안 보냈으면 `null`)이라 화면이 `senderLabel === myLabel`로 내 메시지를 구분합니다. 보내기는 STOMP가 아니라 REST입니다 — STOMP로 보내다 에러가 나면 연결이 끊기기 때문(PRODUCT_SPEC D29).
- 요청자 식별은 토큰(→ `X-User-Id`)으로 합니다. 개설 요청의 `buildingId`/`hostUserId`는 서버가 내 계정·내 건물로 채웁니다(통합 시 확정).
- 대표는 개설 직후 자동으로 첫 참여자가 됩니다. 그래서 `targetParticipantCount`·`participantCount`에는 **대표가 포함**됩니다.

### `PodCreateRequest` (2026-11 개편)

```json
{
  "category": "TISSUE",
  "title": "코스트코 휴지 30롤",
  "description": "코스트코 송도점, 3겹 30m",
  "totalAmount": 21900,
  "totalUnits": 30,
  "unitLabel": "롤",
  "unitsPerPerson": 10,
  "targetParticipantCount": 3,
  "commissionRate": 0.05,
  "deadline": "2026-11-10T20:00:00",
  "originalPrice": null,
  "pickupNote": "1층 공동현관 앞"
}
```

| 필드 | 필수 | 규칙 |
| --- | --- | --- |
| category | ✅ | `TISSUE`(휴지·물티슈) · `LAUNDRY`(세제·세탁) · `BATH`(샴푸·욕실) · `KITCHEN`(주방용품) · `CLEANING`(청소용품) · `DAILY`(생활잡화) · `PROCESSED_FOOD`(생수·가공식품, 밀봉·상온만) · `ETC`(기타) |
| title | ✅ | |
| description | | 최대 500자. 제품 설명·구매처 |
| totalAmount | ✅ | 양수 |
| totalUnits | ✅ | 양의 정수. 묶음 전체 개수 |
| unitLabel | ✅ | 최대 10자 ("롤", "팩", "개", "병") |
| unitsPerPerson | ✅ | 양의 정수. 1인이 받는 미개봉 개수 |
| targetParticipantCount | ✅ | **대표 포함** 인원. `unitsPerPerson × targetParticipantCount ≤ totalUnits`가 아니면 400 |
| commissionRate | | 비우면 0.05 |
| deadline | | 표시용, 자동 마감 없음 |
| originalPrice | | "혼자 샀을 때" 비교 가격, 절약액 카드용 |
| pickupNote | | 최대 100자. 대략적인 장소만 ("호수 같은 상세 주소는 적지 마세요" 안내) |

### `Pod` 응답 (2026-11 개편)

```json
{
  "id": 12, "isHost": false,
  "category": "TISSUE", "categoryLabel": "휴지·물티슈", "title": "코스트코 휴지 30롤", "description": "코스트코 송도점, 3겹 30m",
  "totalAmount": 21900, "totalUnits": 30, "unitLabel": "롤", "unitsPerPerson": 10,
  "targetParticipantCount": 3, "participantCount": 2,
  "commissionRate": 0.05, "perPersonAmount": 11498,
  "deadline": "2026-11-10T20:00:00", "deadlinePassed": false, "status": "OPEN", "closed": false,
  "originalPrice": null, "pickupNote": "1층 공동현관 앞", "imageVersion": 1
}
```

- 대표 판별은 `isHost`(보는 사람이 대표인지). 도로명주소·좌표는 넣지 않습니다. `buildingId`/`hostUserId`가 응답에 남을지는 통합 시 확정.
- `deadlinePassed`: 마감 예정일이 지났는지(표시용, 자동 마감 아님). 픽업 PIN은 이 응답에 없고 참여자 전용 `GET /pods/{id}/me`에만 있습니다.
- `status`: `OPEN` / `CLOSED` / `CANCELLED`. `closed`는 호환용(`status != OPEN`).
- `imageVersion`: 대표가 올린 상품 사진의 버전(올릴 때마다 +1). `null`이면 사진 없음 → 프론트가 제목·카테고리로 고른 예시 사진(`public/pods`)이나 카테고리 아이콘을 보여줍니다. 사진은 `GET /pods/{id}/image`로 따로 받습니다(`<img>`는 토큰을 못 붙여서 같은 건물 확인을 위해 JSON의 `dataUrl`로 내려줌). 프론트는 올리기 전에 긴 변 800px JPEG로 줄입니다(위치 정보 EXIF도 제거됨).
- `perPersonAmount` = 총액 × (1 + 수고비율) ÷ **현재 참여자 수**(대표 포함, 0이면 1로 계산), 원 단위 올림 — 기존 공식 그대로.

### 수정·취소 규칙 (2026-11 개편)

- 수정: 대표가 아니면 403, 대표 외 참여자가 있으면(`participantCount > 1`) 409 "이웃이 참여한 뒤에는 수정할 수 없어요", 마감·취소된 팟이면 409. 개설과 같은 검증을 다시 합니다.
- 취소: 대표가 아니면 403, 이미 마감·취소면 409. 취소 후 상태 `CANCELLED`, 목록에서 제외, WebSocket으로 상태 변경 이벤트를 보냅니다.
- 참여 취소(참여자): 마감 전까지 가능(기존 동작).

## ③ 대표 수고비 정산

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | /settlements/receipts | 영수증 업로드 → OCR 인식 | multipart: `receipt` (JPG/PNG, 10MB 이하) | `{ recognizedAmount, success }` |
| POST | /settlements/{podId}/confirm | 정산 확정 (대표만, 마감된 팟만) | `{ recognizedCost, commissionRate, hostPaymentLink? }` | `Settlement` |
| GET | /settlements/{podId} | 확정된 정산 결과 조회 | - | `Settlement` 또는 `null`(정산 전) |

- OCR 인식 실패는 200 + `data.success=false` → 프론트가 수동 입력으로 전환. 파일 자체가 잘못되면 400.
- 1인당 = 영수증 금액 × (1 + 수고비율) ÷ 확정 시점 참여자 수, 원 단위 올림. 참여자 수·1인당 금액은 스냅샷으로 저장.
- **접근 권한**: 같은 건물 소속만(다른 건물 403), 확정은 대표만.
- 세부 규칙: [handoff/settlement.md](./handoff/settlement.md).

## ④ ~~최저가 조회~~ — 삭제됨

코드에서 제거됨. 과거 계약은 Git 히스토리로만 남습니다.

## ⑤ 건물별 익명 커뮤니티

입장 시 ①의 GPS 확인(`purpose=COMMUNITY_ENTER`)을 먼저 통과해야 합니다.

> 같은 건물 주민만 볼 수 있습니다(다른 건물 글은 ID로 직접 접근해도 403).

| Method | Endpoint | 설명 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| GET | /community/posts?buildingId=&category= | 글 목록 (우리 건물, 숨김글 제외) | 쿼리: buildingId, category? | `CommunityPostSummary[]` |
| POST | /community/posts | 글 작성 | `{ category, content }` | `CommunityPostDetail` |
| GET | /community/posts/{id} | 글 상세 + 댓글 | - | `CommunityPostDetail` |
| DELETE | /community/posts/{id} | 글 삭제 (본인만) | - | - |
| POST | /community/posts/{id}/comments | 댓글 작성 | `{ content }` | `CommunityPostDetail` |
| DELETE | /community/comments/{id} | 댓글 삭제 (본인만) | - | - |
| POST | /community/posts/{id}/report | 글 신고 | - | - |
| POST | /community/comments/{id}/report | 댓글 신고 | - | - |

- **익명화**: 글쓴이는 `"글쓴이"`, 그 외 작성자는 그 글 안에서 처음 등장한 순서대로 `"이웃 1"`, `"이웃 2"`... 실제 `authorUserId`·닉네임은 절대 응답에 포함하지 않습니다(신고 처리용 내부 보관).
- **`CommunityCategory`**: `FREE`(자유) / `QUESTION`(질문) / `SHARE`(나눔) / `GROUP_BUY_SUGGESTION`(공구 제안).
- **`suggestable`**: 공구 제안 글이면 true → 프론트가 "이 품목으로 팟 열기" 버튼을 보여주고 `/pods/new`로 이동(GPS 재확인).
- **신고 자동숨김**: 신고 3회 이상이면 `hidden=true`, 목록·상세에서 제외.
- **`CommunityPostSummary`**: `{ id, category, content, preview(60자), commentCount, suggestable, mine, createdAt }` — 작성자 정보 없음.
- **`CommunityPostDetail`**: `{ id, category, authorLabel, content, suggestable, mine, createdAt, comments: [{ id, authorLabel, content, mine, createdAt }] }`.
- **에러 코드**: 없는/숨김 글 404 · 중복 신고·본인 글 신고 409 · 다른 건물·건물 미등록 403(`BUILDING_ACCESS_DENIED`) · 남의 글 삭제 403 · 빈 내용/길이 초과(글 2000자, 댓글 500자)/잘못된 카테고리 400. 구현 상세: [handoff/community.md](./handoff/community.md)
