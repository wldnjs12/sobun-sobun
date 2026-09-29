# 핸드오프 — QR+GPS 건물 인증 API (`feature/qr-auth`)

담당: 문소원(백엔드) · PR: [#1](https://github.com/wldnjs12/sobun-sobun/pull/1) (→ `develop`) · 관련 문서: [01-onboarding](../features/01-onboarding.md), [ERD](../ERD.md)

## 1. 한 줄 요약

QR 토큰 + GPS 좌표로 "같은 건물 50m 이내"인지 확인하는 `POST /api/auth/verify`를 구현했고, 통과 시 사용자-건물 인증 기록(`BUILDING_AUTH`)을 남긴다.

## 2. API 명세

`POST /api/auth/verify`

| 구분 | 내용 |
| --- | --- |
| 헤더 | `Content-Type: application/json`, `X-User-Id: <숫자>` (선택, [5번](#5-임시-처리--todo) 참고) |
| 요청 | `{ "qrToken": string, "latitude": number, "longitude": number }` |
| 성공 | `200` · `{ "success": true, "data": true, "message": null }` |
| 실패 | `400` · `{ "success": false, "data": null, "message": "...", "code": "..." }` |

**처리 순서** — 먼저 걸리는 것 하나만 응답: 토큰 조회 → 만료 확인 → 거리(Haversine) ≤ 50m → 기록 저장

**에러 코드** — `code`로 분기하고 `message`는 화면에 그대로 표시

| code | message | 화면 처리 (01-onboarding 기준) |
| --- | --- | --- |
| `INVALID_QR` | 유효하지 않은 QR이에요. 다시 스캔해주세요. | 재스캔 |
| `EXPIRED_QR` | QR이 만료됐어요, 다시 스캔해주세요. | 재스캔 |
| `OUT_OF_RANGE` | 건물 근처에서 다시 시도해주세요. | 위치 이동 후 재시도 |

**요청 값 검증 실패** — `400`, `code` 없음, `message`만 (여러 개 틀려도 첫 번째 하나만)

| 조건 | message |
| --- | --- |
| `qrToken` 누락/공백 | QR 토큰이 없어요, 다시 스캔해주세요 |
| 위도/경도 누락 | 위치 정보가 필요해요 |
| 위도 -90~90 밖 | 위도 값이 올바르지 않아요 |
| 경도 -180~180 밖 | 경도 값이 올바르지 않아요 |

> ⚠️ JSON 형식 자체가 깨졌거나 `X-User-Id`가 숫자가 아니면 공통 응답 래퍼가 아닌 Spring 기본 에러(400)가 내려온다.

**예시**

```http
POST /api/auth/verify
Content-Type: application/json
X-User-Id: 1

{ "qrToken": "demo-qr-token", "latitude": 37.5668, "longitude": 126.9780 }
```

```json
// 성공 (200)
{ "success": true, "data": true, "message": null }

// 실패 (400) — 반경 밖
{ "success": false, "data": null, "message": "건물 근처에서 다시 시도해주세요.", "code": "OUT_OF_RANGE" }
```

## 3. 변경 사항

**DB / 엔티티**

| 테이블 | 변경 |
| --- | --- |
| `building` | 컬럼 추가: `qr_token` (unique, nullable), `qr_token_expires_at` (nullable, null = 만료 없음) |
| `building_auth` | 신규: `id`, `building_id`, `user_id`, `verified_at` · `(building_id, user_id)` 유니크 · DB FK 없음 (USER 엔티티 없음) |

`ddl-auto: update`라 앱 실행 시 자동 반영된다. 재인증 시 새 행이 아니라 `verified_at`만 갱신.

**파일** (`backend/src/main/java/com/ppuri/sobunsobun/` 기준)

- `auth/controller/BuildingAuthController` — `@Valid`, `X-User-Id` 헤더, 실패 → 400 변환
- `auth/service/BuildingAuthService` — 인증 로직 + Haversine `distanceMeters`
- `auth/dto/QrVerifyRequest` — 검증 어노테이션
- `auth/domain/Building` — QR 컬럼 2개 + 생성자 2개 추가 (기존 필드 변경 없음)
- `auth/domain/BuildingAuth`, `BuildingAuthRepository`, `BuildingRepository`, `BuildingAuthErrorCode`, `BuildingAuthException` — 신규
- `global/common/ApiResponse` — `code` 필드(null이면 JSON에서 생략) + `fail(code, message)` 추가
- 테스트: `HaversineDistanceTest`(4), `BuildingAuthServiceTest`(8) — 12개 통과
- `docs/ERD.md` 갱신, `frontend/package-lock.json` 추가(chore)

**다른 도메인 영향**

- `Building`(② 팟도 사용): 컬럼·생성자 **추가만**. 기존 코드는 수정 불필요.
- `ApiResponse`(전 도메인 공통): 기존 `ok`/`fail(message)` 동작·JSON 형태 그대로. 실패 코드가 필요하면 `fail(code, message)` 사용 가능.

## 4. 로컬 테스트 방법

1. 테스트 건물 넣기 (앱 한 번 실행해서 테이블 생성된 뒤):
   ```sql
   INSERT INTO building (name, latitude, longitude, qr_token, qr_token_expires_at) VALUES ('테스트빌라', 37.5665, 126.9780, 'demo-qr-token', NULL);
   ```
2. 호출:
   ```bash
   # 성공 (약 33m) + 기록 저장
   curl -X POST http://localhost:8080/api/auth/verify -H "Content-Type: application/json" -H "X-User-Id: 1" \
     -d '{"qrToken":"demo-qr-token","latitude":37.5668,"longitude":126.9780}'
   # OUT_OF_RANGE (약 67m)
   curl -X POST http://localhost:8080/api/auth/verify -H "Content-Type: application/json" \
     -d '{"qrToken":"demo-qr-token","latitude":37.5671,"longitude":126.9780}'
   # INVALID_QR
   curl -X POST http://localhost:8080/api/auth/verify -H "Content-Type: application/json" \
     -d '{"qrToken":"wrong-token","latitude":37.5665,"longitude":126.9780}'
   ```
3. `EXPIRED_QR` 확인: `UPDATE building SET qr_token_expires_at = now() - interval '1 minute' WHERE qr_token = 'demo-qr-token';`
4. 기록 확인: `SELECT * FROM building_auth;` — 같은 `X-User-Id`로 다시 호출해도 행 수는 그대로, `verified_at`만 바뀜.
5. 단위 테스트: `./gradlew test`

> 💡 Windows에서 사용자 폴더 이름이 한글이면 `./gradlew test`가 `Could not find or load main class ...GradleWorkerMain`로 실패한다. 환경변수 `GRADLE_USER_HOME=C:\gradle-home`(영문 경로)을 설정하면 해결된다.

## 5. 임시 처리 / TODO

- **`X-User-Id` 헤더** (컨트롤러에 TODO): 로그인이 없어서 임시로 사용자 식별. 헤더가 없으면 판정만 하고 기록은 저장 안 함. 로그인 도입 시 인증 정보에서 userId를 꺼내도록 교체 예정 → **프론트 호출 방식도 바뀔 수 있음**.
- **QR 토큰 발급**: 발급/갱신 API 없음. DB에 직접 넣는다.
- `building_auth`의 `building_id`/`user_id`는 DB FK 없음 — USER 엔티티 생기면 연관관계 검토.

## 6. 미결정 사항 / 가정

| 항목 | 현재 가정 |
| --- | --- |
| GPS 오차 buffer | 없음. 50m 이하 통과, 초과 실패 (정확히 50m는 통과) |
| QR 갱신 주기 | 자동 갱신 없음. 만료 null = 데모용 고정 QR |
| 만료 경계 | `현재 시각 ≥ 만료 시각`이면 만료. 서버 로컬 시간 기준 |
| 인증 유효기간 | 판정 없음. `verified_at`만 기록 |
| 실패 HTTP 상태 | 3종 모두 400 |
| 동시 재인증 | 같은 사용자가 같은 순간 두 번 요청하면 하나는 유니크 제약 DB 에러. 별도 처리 없음 |

## 7. 누가 알아야 하나

- **김민준 (프론트, 온보딩 화면 S1~S3)**
  - 실패 시 `code`로 분기, `message`는 그대로 표시.
  - `code`가 없는 400 = 요청 값 문제(좌표 누락 등). 위치 권한 거부는 요청 전에 프론트에서 처리.
  - 로그인 전까지 `X-User-Id` 헤더를 붙여야 인증 기록이 남음 (값을 어디서 가져올지 합의 필요).
- **최지원 (② 팟 백엔드)**
  - `Building`에 `qrToken`, `qrTokenExpiresAt` 컬럼과 생성자가 추가됨. 기존 코드 영향 없음 — 확인만 부탁.
  - 팟 목록에서 "인증된 사용자만" 제한이 필요하면 `BuildingAuthRepository.findByBuildingIdAndUserId`를 쓸 수 있음.
- **전원**: `ApiResponse`에 선택 필드 `code`가 생김 (기존 응답 형태는 그대로).

## 8. 다음 작업

- [ ] PR #1 리뷰 반영 후 `develop` 머지
- [x] `docs/API_SPEC.md`에 에러 코드·`X-User-Id` 헤더 반영
- [ ] 팀 논의: GPS buffer, QR 갱신 주기, 인증 유효기간 → 결정되면 `01-onboarding.md` "열려있는 질문" 갱신
- [ ] QR 토큰 발급/재발급 방법 (관리자 API 또는 데모용 고정값 유지)
- [ ] 로그인 도입 시 `X-User-Id` 제거
- [ ] 김민준 님 프론트 연동 시 실제 기기(실내 GPS)로 반경 판정 확인
