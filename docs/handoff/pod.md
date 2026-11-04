# 핸드오프: ② 팟 개설·참여·실시간 정산

> ⚠️ **참고**: 2026-10-03 기획 개편으로 ②팟에 "건물 소속 검증"(다른 건물 접근 403)이 추가될 예정입니다. 이 문서의 나머지 내용(생성/참여/실시간 갱신)은 여전히 유효합니다 — 변경분은 [features/02-pod.md](../features/02-pod.md) 참고.

_최종 갱신: 2026-11-04 · 브랜치: feature/gps-server-check (이전: feature/pod-realtime)_

## 🆕 2026-11-04 · GPS 2차 확인 서버 강제 + 시연 화면 정리 (최지원 · feature/gps-server-check)

**왜**: 지금까지는 프론트만 `/auth/location-check`를 부르고, 팟 개설·참여 API는 위치 확인 여부를 몰랐음 → API를 직접 호출하면 GPS 없이 개설·참여 가능. API_SPEC의 "반드시 서버에서 판정"과 어긋남.

**한 일**
- `LocationCheckService.requireRecentPass(userId, buildingId, purpose)` 추가 — `LOCATION_CHECK` 로그에서 "최근 3분(`RECENT_PASS_VALID_SECONDS=180`) 안, 같은 건물, 같은 목적, 성공" 기록이 있는지 조회. 없으면 `LocationCheckException("LOCATION_CHECK_REQUIRED")`
- `PodService.create` → `POD_CREATE`, `PodService.join` → `POD_JOIN` 확인. **대표는 개설 직후 자동 참여(프론트 `createPod`)할 때 면제** (개설 때 이미 확인)
- `LocationCheckException` 처리를 `AuthController` 안 핸들러 → `GlobalExceptionHandler`로 이동 (팟 API에서 던지면 500이 나던 문제 방지). 응답 형식은 그대로 `400 + code`
- 프론트: 건물 홈 빈 상태의 동작 없는 "투표함" 버튼 → "사고 싶은 것 커뮤니티에 제안하기"(`/community`, 목록에서 입장 GPS 확인). 마이페이지 "(로그인 전 임시)" 문구 제거

**확인**: 백엔드 테스트 108개 통과(신규 5개), 프론트 빌드 통과. 실제 서버(임시 Postgres, 데모 모드)에서 curl로: 위치 확인 없이 개설 → 400 `LOCATION_CHECK_REQUIRED` / `POD_CREATE` 통과 후 개설 성공 / 대표 자동 참여 성공 / 이웃이 확인 없이 참여 → 400 / 목적이 다른(`POD_CREATE`) 기록만 있으면 참여 → 400 / `POD_JOIN` 통과 후 참여 성공. 미등록 사용자 location-check는 기존대로 400 `BUILDING_NOT_REGISTERED`

**주의**: 데모 모드(`LOCATION_CHECK_DEMO_MODE=true`)에서도 location-check 호출 자체는 필요함(항상 통과 기록을 남기므로 정상 흐름엔 영향 없음). 데모용 데이터를 curl로 넣는 스크립트가 있다면 `/pods` 전에 location-check를 먼저 호출해야 함

---

## 이번 작업 요약

**1차 (백엔드 기본 구현)**
- 백엔드 API 5개 구현: `POST /pods`, `GET /pods/{id}`, `POST/DELETE /pods/{id}/join`, `POST /pods/{id}/close`
- `Pod` 엔티티에 참여/취소/마감/1인당 금액 계산 규칙을 도메인 메서드로 구현 (순수 로직, 단위 테스트로 검증)
- `PodParticipant` 엔티티 신규 추가 (ERD의 `POD_PARTICIPANT`)
- 참여 시 동시성(레이스 컨디션) 처리: `PodRepository.findByIdForUpdate`로 행 잠금 후 참여 처리 → 목표 인원 초과 참여 불가
- 상태가 바뀔 때마다(참여/취소/마감) `/topic/pods/{id}`로 `PodAmountUpdateEvent` 브로드캐스트
- `GlobalExceptionHandler` 신규 추가 — 도메인 예외(`IllegalStateException`→409, `IllegalArgumentException`→404)를 `ApiResponse.fail`로 통일 (이전엔 전역 예외 처리가 전혀 없었음)
- 기존에 있던 placeholder `POST /pods/{id}/recalculate` 엔드포인트 제거 (API_SPEC에 없던 임시 엔드포인트, 프론트에서도 미사용 확인 후 제거)

**2차 (마무리 보완 — `/plan pod 마무리 보완`)**
- `GET /pods?buildingId=` 목록 조회 추가 — `docs/DESIGN_HANDOFF.md` S4(건물 홈 화면)가 요구했지만 코드·API_SPEC.md 어디에도 없던 엔드포인트. 진행중(미마감) 팟만 최신순으로 반환.
- `PodAmountUpdateEvent`에 `closed` 필드 추가 — 마감도 이제 실시간으로 전달됨.
- 팟 생성 시 `buildingId` 존재 검증 추가 (없으면 404) — 이를 위해 `auth/repository/BuildingRepository.java`를 신규 추가 (문소원님 `auth` 영역, 클래스 주석에 이유 남김).
- `PodServiceTest` 추가 (Mockito, buildingId 검증/목록 매핑 커버)

## 기획 대비 확인 (spec-check)

**✅ 일치**
- 금액 계산식 `총액 × (1+수고비율) / 참여자수` (원 단위 CEILING) — `docs/features/02-pod.md` 그대로
- 마감은 목표 인원 도달 시에만 "가능"해지고 자동 마감은 없음, `deadline`은 저장만 하고 표시용으로만 사용
- 참여 취소는 마감 전까지만, 참여자 0명이면 마감 불가, 대표만 마감 가능
- WS 규약(`/ws-sobun`, `/topic/pods/{id}`, `PodAmountUpdateEvent`), 재연결 시 `GET /pods/{id}` 동기화 — 계약 그대로 유지
- `POD_PARTICIPANT` 필드가 ERD와 정확히 일치
- 모든 응답이 `ApiResponse<T>`로 감싸짐

**⚠️ 의도적으로 단순화/확장한 부분**
- `hostUserId`를 `Pod`에 추가했습니다 (ERD·API_SPEC.md 원본엔 없음). "대표만 마감 가능"을 구현하려면 대표를 식별할 값이 필요한데 기획 문서에 빠져있어서 추가한 것 — `docs/API_SPEC.md`도 이번에 실제 계약대로 갱신함.
- ①(로그인/세션)이 아직 없어서 `join`/`cancelJoin`/`close`에 `userId`/`hostUserId`를 쿼리 파라미터로 직접 받습니다. 세션이 붙으면 세션에서 꺼내도록 교체 필요 — `PodController`에 TODO 주석 남김.
- `PodRepository`/`PodParticipantRepository`를 `pod.repository` 패키지로 분리했습니다. 루트 `CLAUDE.md`엔 `controller/service/domain/dto`만 명시돼 있어서 `/spec-check` 때 이 부분을 짚었고, 팀 확인 결과 **`repository`는 계속 별도 패키지로 유지하기로 결정** (Spring 프로젝트에서 흔한 레이어라 CLAUDE.md 목록은 예시로 취급).
- ~~`auth/repository/BuildingRepository.java`를 임시로 추가~~ → **(2026-10-03, develop 머지 시 정리됨)** ①(qr-auth) PR이 `auth.domain.BuildingRepository`(`findByQrToken` 포함)를 이미 만들어놔서 중복이었음. 제 임시 버전은 삭제하고 `PodService`가 `auth.domain.BuildingRepository`를 쓰도록 교체함.

**❌ 남은 것 (다음 작업자가 확인)**
- 없음. `/spec-check`에서 나온 항목은 모두 위 ⚠️로 정리·해소됨.

## API 표면

| Method | Endpoint | 파라미터 | 설명 |
| --- | --- | --- | --- |
| POST | `/api/pods` | body: `{ buildingId, hostUserId, title, totalAmount, targetParticipantCount, commissionRate?, deadline? }` | 팟 개설 (buildingId 없으면 404) |
| GET | `/api/pods?buildingId=` | 쿼리: buildingId | 건물의 진행중(미마감) 팟 목록, 최신순 |
| GET | `/api/pods/{podId}` | - | 팟 상세 (재연결 동기화용) |
| POST | `/api/pods/{podId}/join?userId=` | - | 참여 |
| DELETE | `/api/pods/{podId}/join?userId=` | - | 참여 취소 (마감 전까지만) |
| POST | `/api/pods/{podId}/close?hostUserId=` | - | 마감 (대표만, 참여자 0명이면 실패) |
| WS | `/ws-sobun` → `/topic/pods/{id}` | - | `PodAmountUpdateEvent { podId, participantCount, perPersonAmount, closed }` |

## 알려진 제한사항 / TODO

- `userId`/`hostUserId`를 요청 파라미터로 받는 임시 계약 — ① 온보딩/세션 붙으면 세션 기반으로 교체 (`PodController`의 TODO 참고)
- `hostUserId` 유효성(실존 여부)은 검증하지 않음 — User 엔티티가 아직 없어서 검증할 방법이 없음 (`buildingId`는 2차 작업에서 검증 추가됨)
- User 엔티티가 아직 없어서 `userId`/`hostUserId`는 그냥 `Long`으로만 다룸

## 다음 작업자 안내

- 로컬 실행: `cd backend && ./gradlew bootRun` (단, 이 머신은 기본 `java`가 25라서 Lombok 1.18.34와 충돌 — `JAVA_HOME`을 JDK 17로 맞추고 실행할 것. 팀 전체에 해당하는 문제라면 `gradle.properties`에 `org.gradle.java.home` 고정 고려)
- 테스트: `./gradlew test` — `PodTest`(도메인 규칙) + `PodServiceTest`(buildingId 검증·목록 매핑)가 커버
- 프론트(도우현) 연동 시 `frontend/src/features/pod/PodPage.jsx`, `frontend/src/api/socket.js`가 이미 기대하는 계약과 맞춰뒀음 (`GET /pods/{id}` 최초 로딩, WS 구독)
- 다음에 할 일: ③(정산) 쪽에서 마감된 `Pod`를 가져다 쓸 때 `hostUserId` 필드를 참고할 수 있음. ①(세션) 완성되면 이 문서의 "임시 계약" 부분부터 정리
