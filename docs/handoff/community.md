# 핸드오프: ⑤ 건물별 익명 커뮤니티 — 백엔드

_최종 갱신: 2026-10-03 · 브랜치: feature/community_

담당: 김민준(백엔드) · 프론트: 도우현(팀 합의, `frontend/src/features/community/` — [handoff/frontend.md](./frontend.md)) · 관련 문서: [05-community](../features/05-community.md), [API_SPEC ⑤](../API_SPEC.md), [ERD](../ERD.md), [open-decisions](../open-decisions.md), [REPLAN_WORK_ASSIGNMENT](../REPLAN_WORK_ASSIGNMENT.md)

## 이번 작업 요약

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
- 다음 할 일
  1. **@도우현**: 이 PR 머지 후 `frontend/src/features/community/communityApi.js`의 `USE_MOCK = false`로 바꾸면 실제 서버에 붙음 (엔드포인트·필드 이름 모두 프론트 가정과 일치 확인함)
  2. `frontend/src/features/products/`(최저가 화면)·`/products` 라우트 삭제 — REPLAN_WORK_ASSIGNMENT상 김민준 담당으로 남아 있음, 프론트 담당이 바뀐 만큼 누가 할지 팀에서 정리 필요
