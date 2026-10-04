# 핸드오프: ⑤ 건물별 익명 커뮤니티

_최종 갱신: 2026-10-04 · 브랜치: feature/server-timezone (프론트 연결: feature/community-api-connect · 백엔드: feature/community, PR #22)_

담당: 김민준(백엔드) · 프론트: 도우현(팀 합의, `frontend/src/features/community/` — [handoff/frontend.md](./frontend.md)) · 관련 문서: [05-community](../features/05-community.md), [API_SPEC ⑤](../API_SPEC.md), [ERD](../ERD.md), [open-decisions](../open-decisions.md), [REPLAN_WORK_ASSIGNMENT](../REPLAN_WORK_ASSIGNMENT.md)

## 이번 작업 요약

### 2026-10-04 · 프론트 실서버 연결 (최지원, feature/community-api-connect)

- `frontend/src/features/community/communityApi.js`의 `USE_MOCK`을 `false`로 변경 → 화면이 실제 `/api/community/**`를 호출
- 목업 코드는 온보딩(`onboardingApi.js`)과 같은 방식으로 남겨둠 — 백엔드 없이 화면만 볼 때 `true`로 바꾸면 됨
- **댓글 삭제 응답 차이 보정**: 화면(`CommunityDetailPage`)은 `deleteComment()`가 갱신된 글 상세를 돌려준다고 가정해 `setPost(...)`에 넣는데, 실제 `DELETE /comments/{id}`는 `data: null`. 그대로면 상세 화면이 깨지므로 API 함수에서 삭제 후 `fetchPost(postId)`로 상세를 다시 불러와 반환하도록 함 (화면 파일은 수정 없음)
- 목록·상세·댓글 응답 필드(`content`, `preview`, `commentCount`, `authorLabel`, `mine`, `suggestable`, `createdAt`)는 백엔드 DTO와 일치 확인

### 2026-10-03 · 백엔드 (김민준, feature/community, PR #22)

- `backend/.../community/` 신규 — API 계약(API_SPEC ⑤)의 엔드포인트 8개 전부 구현
  - 엔티티: `CommunityPost`, `CommunityComment`, `CommunityReport`(대상+신고자 유니크 제약), enum `CommunityCategory`, `ReportTargetType`
  - `CommunityPostService` — 글/댓글 목록·작성·상세·삭제, 건물 격리, 익명 닉네임 조립
  - `CommunityModerationService` — 신고, 자동 숨김(`REPORT_HIDE_THRESHOLD = 3`, open-decisions에 적힌 위치 그대로)
  - `AnonymousNicknames` — "글쓴이" / "이웃 N" 계산 (저장하지 않고 응답 만들 때마다 계산)
  - 건물 격리는 ①의 공용 가드 `BuildingAccessService.requireMembership()` 사용 → 다른 건물이면 `403` + `code: "BUILDING_ACCESS_DENIED"` (팟과 같은 형식이라 프론트의 `AccessDeniedView`가 그대로 동작). 글 작성 시 건물은 `User.buildingId`로 정함
- 최저가(④) 백엔드 삭제: `backend/.../product/` 패키지 전체, `application.yml`·`application-local.yml.example`의 `naver.shopping` 설정 (REPLAN_WORK_ASSIGNMENT의 "커뮤니티 PR에서 같이 지운다")
- 테스트 29개 추가 (`backend/src/test/.../community/`), 백엔드 전체 테스트 통과

## 기획 대비 확인 (spec-check)

**일치**
- 익명화: 글쓴이는 항상 "글쓴이", 나머지는 그 글 안 첫 등장 순서대로 "이웃 1, 2…", 같은 사람은 같은 번호. 글쓴이가 자기 글에 댓글을 달아도 "글쓴이"(번호 부여 대상 아님)
- `authorUserId`는 DB에만 있고 응답 DTO에 필드 자체가 없음 (컨트롤러 테스트에서 응답에 `userId` 문자열이 없는지 확인)
- 신고 3회 누적 시 자동 숨김 → 목록·상세·댓글·신고에서 없는 글(404)로 취급
- 같은 사람의 중복 신고는 세지 않음 (사전 확인 + DB 유니크 제약, 동시 클릭도 409로 처리)
- 본인 글/댓글만 삭제. 다른 건물 글/댓글은 목록·상세·작성·댓글·신고·삭제 모두 403
- `suggestable` = 카테고리가 `GROUP_BUY_SUGGESTION`일 때 true
- 글-팟 간 FK 없음 (공구 제안 글을 지워도 팟에는 영향 없음)

**문서에 없어서 정한 것 (리뷰 때 확인 부탁)**
- `CommunityPostSummary` 필드: `id, category, content(전체 본문), preview(공백 정리 후 60자 + "…"), commentCount(숨김 제외), suggestable, mine, createdAt` — 도우현 프론트가 가정한 형식(`content` 첫 줄을 제목처럼 표시)에 맞추고, 디자인 S16의 미리보기용 `preview`도 둠. 목록 카드에는 작성자 닉네임을 넣지 않음(닉네임은 글 단위 개념이라)
- `mine` 필드 추가 (목록·상세·댓글): 요청한 사람이 쓴 것인지. 프론트가 삭제 버튼 노출 여부를 정하려면 필요. 본인에게만 의미 있는 값이라 익명성을 해치지 않음
- 글 작성 시 건물은 요청으로 받지 않고 작성자의 소속 건물로 정함 (계약에도 body에 buildingId 없음 — 다른 건물에 글 쓰기 원천 차단)
- 길이 제한: 글 2,000자, 댓글 500자. 앞뒤 공백은 잘라서 저장
- 본인 글/댓글은 신고 불가 (409)
- 숨김 댓글 작성자도 번호를 계속 차지함 → 숨김이 생겨도 다른 사람 번호가 바뀌지 않음
- 응답 코드: 없는/숨김 글·댓글 404, 중복·본인 신고 409, 다른 건물·건물 미등록 403(`code: BUILDING_ACCESS_DENIED`), 남의 글/댓글 삭제 403(code 없음 — 건물 문제가 아니므로 "다른 건물" 화면이 뜨면 안 됨), 입력값 오류 400 (모두 `{ success:false, message }` 형식)

**프론트 연결(10/04) 대조 결과**
- 일치: 엔드포인트 8개 경로·쿼리(`userId`, `buildingId`, `category`)와 응답 필드 모두 프론트 호출과 일치
- 보정: 댓글 삭제 응답(`null`) ↔ 프론트 기대(상세) 차이 → 프론트 API 함수에서 재조회로 해결 (백엔드 계약은 그대로)
- 미확인: 실제 서버를 띄운 브라우저 확인은 못 함 (작업 PC에 Postgres/Docker 없음). 프론트 빌드·백엔드 커뮤니티 테스트만 통과 확인

**재확인 필요**
- 댓글을 **삭제**하면 그 뒤 작성자들의 "이웃 N" 번호가 당겨질 수 있음 (ERD에 soft delete 컬럼이 없어 실제 삭제). 문제 되면 댓글에 `deleted` 플래그를 두는 방식으로 바꿀 수 있음
- 숨김 처리된 글/댓글을 되살리는 기능(관리자 검토)은 없음 — MVP 범위 밖

## API 표면

베이스 `/api/community` · `userId`는 팟 API와 같은 임시 방식(쿼리 파라미터)

| Method | Endpoint | 성공 응답 |
| --- | --- | --- |
| GET | `/posts?buildingId=&userId=&category=` | `CommunityPostSummary[]` (최신순, category 생략 시 전체) |
| POST | `/posts?userId=` · `{ category, content }` | `CommunityPostDetail` |
| GET | `/posts/{id}?userId=` | `CommunityPostDetail` |
| DELETE | `/posts/{id}?userId=` | `null` (댓글·신고 기록도 함께 삭제) |
| POST | `/posts/{id}/comments?userId=` · `{ content }` | `CommunityPostDetail` (댓글 반영된 상세) |
| DELETE | `/comments/{id}?userId=` | `null` |
| POST | `/posts/{id}/report?userId=` | `null` |
| POST | `/comments/{id}/report?userId=` | `null` |

- `CommunityPostDetail`: `{ id, category, authorLabel("글쓴이"), content, suggestable, mine, createdAt, comments: [{ id, authorLabel("글쓴이"|"이웃 N"), content, mine, createdAt }] }` — 숨김 댓글은 빠짐
- `category` 값: `FREE` / `QUESTION` / `SHARE` / `GROUP_BUY_SUGGESTION`

## 알려진 제한사항 / TODO

- 입장 시 GPS 확인(`purpose=COMMUNITY_ENTER`)은 프론트가 ①의 `/api/auth/location-check`로 먼저 호출하는 구조 — 커뮤니티 API 자체는 GPS를 다시 확인하지 않음
- 목록 조회 시 글마다 댓글 수를 따로 세는 쿼리가 나감(N+1). 건물 단위라 글 수가 적어 MVP에서는 문제없음, 많아지면 페이지네이션·집계 쿼리로 개선
- 페이지네이션 없음
- ~~**시간대**: 배포 서버(UTC)에서 "N분 전"이 9시간 어긋남~~ → 10/04 `SobunsobunApplication`에서 JVM 기본 시간대를 `Asia/Seoul`로 고정해 해결 (feature/server-timezone). 단, 그 전에 배포 DB에 저장된 시각은 UTC 그대로라 옛 글은 9시간 전으로 보일 수 있음
- 코드 TODO: `CommunityController`의 `userId` 쿼리 파라미터는 로그인 세션 생기면 세션에서 꺼내도록 교체 (팟 API와 동일)

## 다음 작업자 안내

- 테스트: `cd backend && ./gradlew test --tests 'com.ppuri.sobunsobun.community.*'`
- 로컬 확인 (PostgreSQL 실행 후 `./gradlew bootRun`) — 먼저 ①로 건물 등록이 돼 있어야 함 (키가 없으면 주소 검색은 Stub 후보 2건):
  ```bash
  curl -X POST localhost:8080/api/auth/buildings/register -H 'X-User-Id: 100' -H 'Content-Type: application/json' \
       -d '{"roadAddress":"인천 미추홀구 용현동 123-45","bdMgtSn":"1234567890123456789","buildingName":"용현 한아름아파트","dong":"101동"}'
  curl -X POST "localhost:8080/api/community/posts?userId=100" -H 'Content-Type: application/json' \
       -d '{"category":"GROUP_BUY_SUGGESTION","content":"생수 2L 24병 같이 사실 분"}'
  curl "localhost:8080/api/community/posts?buildingId=1&userId=200"
  ```
- 실서버 확인 결과 (2026-10-03): 같은 건물 2명 글·댓글("이웃 1") 정상, 다른 건물 사용자의 상세·댓글·신고·목록 전부 403 `BUILDING_ACCESS_DENIED`, 건물 미등록 사용자 글쓰기 403, 같은 건물이어도 남의 글 삭제는 403(code 없음)
- 프론트 확인: 백엔드 `bootRun` 후 `cd frontend && npm run dev` → 온보딩으로 건물 등록 → 하단 탭 "커뮤니티"
- 다음 할 일
  1. **실서버 브라우저 확인** (Postgres 있는 PC에서): 글쓰기 → 댓글 → 댓글 삭제(화면 유지되는지) → 같은 글 중복 신고(409 안내 토스트) → 다른 `?user=`로 남의 글 신고 3회 → 목록에서 숨김
  2. ~~배포 서버 시간대 확인~~ (10/04 서버에서 Asia/Seoul 고정으로 해결)
  3. ~~USE_MOCK=false 전환~~ (10/04 완료) · ~~최저가 프론트 삭제~~ (PR #25 완료)
