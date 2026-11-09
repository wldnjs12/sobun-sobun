# 핸드오프: 보완계획 통합 (계정 · 주소 · 팟 · 정산 · 커뮤니티) + QA

_최종 갱신: 2026-11-05 · 브랜치: feature/household-replan (아직 push 안 함)_

> **다음 세션은 여기서 시작하세요.** 현재 상태 요약은 [../PROGRESS.md](../PROGRESS.md), QA 결과는 [../FEEDBACK.md](../FEEDBACK.md), 제품 규칙은 [../PRODUCT_SPEC.md](../PRODUCT_SPEC.md), API 계약은 [../API_SPEC.md](../API_SPEC.md).
> 정산 OCR 세부와 커뮤니티 구현 세부는 [settlement.md](./settlement.md), [community.md](./community.md)에 남아 있어요(2026-10 기록이라 "동네 범위" 같은 옛 표현이 일부 있음 — 충돌하면 PRODUCT_SPEC 우선).

## 이번 작업 요약

브랜치 하나(`feature/household-replan`)에 기능 브랜치 5개를 머지해 보완계획서(10/03) 기준으로 앱 전체를 맞췄어요. `origin/develop` 대비 커밋 43개, 파일 170개.

| 머지한 브랜치 | 내용 |
|---|---|
| `feature/replan-docs` | PRODUCT_SPEC 신규, API_SPEC·ERD·README 등 개편, 옛 문서 11개 삭제 |
| `feature/account-login` | 아이디·비밀번호 회원가입/로그인, opaque 토큰(30일), 서버 필터가 `X-User-Id`를 토큰 사용자로 덮어씀, 계정 id 100000부터 |
| `feature/address-search` | 건물명 없는 주택 등록, 페이지 넘김, 지번 표시, 상세주소(본인만), `ADDRESS_DEMO_FALLBACK` |
| `feature/household-pod` | 카테고리 8개(생수·가공식품 포함), 미개봉 단위 나눔, 검색·필터, 수정·모집 취소·참여 취소, 내 팟, `DEMO_SEED` |
| `feature/community-settlement` | 건물 단위 격리 복귀, 정산은 대표·참여자만, 송금 링크 https만, GPS 실패 원인별 안내 |
| 통합 커밋 | STOMP 구독 토큰 검증, 팟 수정 라우트, 반경 1km 코드 제거 |

### 2026-11-08 GPS 허용 반경 100m → 20km (도우현, 브랜치 feature/location-radius-20km)
- 증상: 배포 사이트(sobun-sobun-eight.vercel.app)에서 팀원들이 "인하로 100"(인하대) 등으로 등록 후 커뮤니티·팟 진입 시 "등록한 건물 근처가 아니에요" — 서버 `POST /auth/location-check`가 **400 `OUT_OF_RANGE`** (버그 아님, 의도된 응답)
- 원인: 넓은 캠퍼스 주소도 좌표 **한 점**으로 저장돼 100m 안에 들기 어렵고, 노트북은 와이파이로 위치를 짐작해 수백 m 오차
- 변경: `LocationCheckService.ALLOWED_RADIUS_METERS` 100 → **20,000**. 테스트는 상수를 기준으로 계산하게 바꿔서 반경을 다시 바꿔도 그대로 통과. 건물 확인 화면 문구 "반경 20km", `docs/features/01-onboarding.md` 갱신
- ⚠️ 20km면 사실상 "인천 근처면 통과"라 건물 인증 효과가 약함 — 정식 운영 전 실측 후 다시 좁힐 것. 위치와 무관하게 통과시키려면 반경 대신 `LOCATION_CHECK_DEMO_MODE=true`(Railway 환경변수)도 있음

### 2026-11-04 세션 (QA)
- Playwright 로컬 QA 1·2차: API 접근 제어, 개설→참여→마감→정산→송금→픽업, 커뮤니티, 수정·취소. 결과 11건(중간 2, 낮음 9) → `docs/FEEDBACK.md`
- 수정: **F-1** 정산 확정 후 모집 완료 화면(`PodCompletePage.jsx`)이 갱신되지 않던 문제 → 마감된 팟이면 10초마다 정산 여부를 확인해 참여자에겐 [정산 결과 보고 송금하기], 대표에겐 [송금 현황 보기] 표시. **F-3** "대표이" → "대표가". **F-9** 숨겨진/삭제된 커뮤니티 글(404) 안내 문구(`CommunityDetailPage.jsx`)
- 결정: **F-2** 커뮤니티 입장 GPS는 서버에서 강제하지 않음 → PRODUCT_SPEC 결정 기록 D26

### 2026-11-08 건물 홈 칩 겹침 수정 (도우현, 브랜치 feature/home-chip-overlap)
- 증상: 건물 홈(`/home`) 카테고리 칩 줄에서 노란 [+ 열기] 버튼이 칩 위에 겹쳐 보임 (배포 사이트에서 발견)
- 원인: 줄 전체(`.chipRow`)가 가로 스크롤이라 화면 폭만큼 줄어든 `.chips` 밖으로 칩이 삐져나왔고, [+ 열기]는 그 줄어든 상자 바로 옆에 놓임
- 수정(`BuildingHomePage.module.css`): 스크롤을 `.chips` 안으로 옮기고 `flex: 1; min-width: 0` → 칩만 옆으로 밀리고 [+ 열기]는 오른쪽 끝 고정. 390px·1200px·끝까지 스크롤 모두 겹침 없음 확인

### 2026-11-08 [+ 열기] 버튼을 탭 줄로 이동 (도우현, 브랜치 feature/home-open-button-tabs)
- 사용자 요청: 카테고리 칩 줄 끝에 있던 노란 [+ 열기]를 "모집중 · 전체" 탭 줄 오른쪽 끝으로
- `BuildingHomePage.jsx`: 탭(`role="tablist"`)과 버튼을 새 `.tabBar`로 감쌈 — 버튼을 tablist 안에 넣으면 화면 낭독기가 탭으로 착각해서 밖에 둠. 밑줄은 `.tabBar` 전체에 그음
- 칩 줄(`.chipRow`)에는 이제 칩만 남음 (가로 스크롤은 그대로 `.chips` 안에서)
- 확인: 390px·1200px에서 버튼 오른쪽 끝 정렬, 탭 글자와 세로 중심 일치, 누르면 `/pods/new`

### 2026-11-08 시연용 랜딩 페이지 2번째 버전 `/intro2` (도우현, 브랜치 feature/landing-v2)
- `frontend/src/features/landing2/` — 발표용 "화려한" 버전. 1번째 버전(`/intro`, PR #48)과 별개. 로그인 여부와 상관없이 열림, [시작하기]·[앱 열기]는 `/`
- 구성: 히어로(바뀌는 품목 글자·마우스 따라오는 빛·입자·둥근 블록) / 흐르는 띠 / **문제·소분·결과 좌우 슬라이드**(섹션 어디든 끌기·막대·키보드, 5초 자동 반복) / **실시간 참여**(대표 화면·이웃 화면이 동시에 1→3명, 1인 금액 변경) / 통계 카운트업 / 기능 카드 / 마지막 CTA(색종이)
- **페이지 자동 넘김**(발표용): 섹션마다 6~15초 머물고 다음 섹션으로, 끝나면 맨 위로 반복. 직접 스크롤·키보드 쓰면 12초 멈춤. 오른쪽 아래 버튼으로 끄고 켬
- 앱에 없는 기능은 넣지 않음: 건물 지도·호수 표시·푸시 알림·픽업 PIN(D23·D27). 숫자는 문서 근거만(설문 = PRODUCT_SPEC 2절, 단가 격차 = features/02-pod.md), 예시 금액은 `calcPerPersonPrice`
- 라이브러리 없이 React + CSS. 둥근 블록은 둥근 사각형 판 56장을 겹쳐 만듦(판 6장 큐브는 모서리를 둥글게 하면 틈이 생겨서). "움직임 줄이기" 설정이면 애니메이션·자동 넘김 꺼짐

### 2026-11-08 건물 홈 팟 카드에 "내가 참여한 팟 / 내가 연 팟" 표시 (도우현, 브랜치 feature/pod-joined-badge)
- 사용자 요청: 목록에서 내가 참여한 팟이 구분되지 않음
- 참여함 = 파란 테두리·연파랑 바탕·맨 위 "✓ 내가 참여한 팟" 띠, 내가 연 팟 = 노란 테두리·띠, 둘 다 버튼은 흰 테두리 [내 팟 보기]. "마지막 1자리" 🔥는 참여 안 한 사람에게만
- 팟 목록 응답에는 `isHost`만 있고 참여 여부가 없어서, 홈을 열 때 `GET /pods/mine?role=joined`로 참여한 팟 id를 받아 표시 (백엔드 변경 없음, 실패해도 목록은 그대로)
- 나중에 서버 목록 응답에 `joined` 같은 필드가 생기면 `BuildingHomePage`의 추가 요청을 빼고 그 값을 쓰면 됨

### 2026-11-09 랜딩 v2 소분 슬라이드: CSS 3D 휴지 롤 (도우현, 브랜치 feature/landing-toilet-roll)
- 사용자 요청: 소분 슬라이드 상자 속 그림이 휴지 같지 않음 (11/8 이모지→아이콘 교체 `a5eaeef`로 🧻가 `layers` 아이콘이 됨)
- 이모지·이미지 없이 CSS로 그린 휴지 롤(`ToiletRoll`: 몸통 좌우 명암 + 아랫면 타원 + 윗면 타원 흰 휴지→갈색 심지→구멍) 3개를 피라미드로 쌓음. "미개봉" 표시는 롤을 가리지 않게 상자 오른쪽 위로

## 기획 대비 확인 (spec-check)
- **일치**: 건물 단위 격리(D4·D6, 다른 건물 ID 직접 접근 403 확인), 타인 응답엔 건물명(+동)만·닉네임 비노출(D5·D24, 커뮤니티 JSON에 사용자 id 없음 확인), 팟 개설·참여 GPS 서버 강제 최근 3분(D13), 미개봉 단위 검증(D8), 수정은 참여자 없을 때만(D10), 송금 링크 https만
- **의도적 단순화**: 커뮤니티 GPS는 화면에서만(D26 — 글은 건물 소속으로 이미 격리, 3분 강제 시 오래 읽다 쓰는 사람이 막힘). 정산 확정은 실시간 이벤트 대신 10초 확인(F-1, 백엔드 변경 최소화). 알림은 서버 API 없이 클라이언트 계산(D23)
- **미확인**: STOMP 다른 건물 구독 거부(코드상 구현, 브라우저 미확인), 댓글 신고·삭제 UI, 실서버(Railway·Vercel) 동작

## API 표면
모두 `ApiResponse<T>`, 로그인 필요(회원가입·로그인 제외), 실시간은 `/ws-sobun` STOMP `/topic/pods/{podId}`.
- 계정 `/api/account`: `POST /signup`, `POST /login`, `GET /me`, `DELETE /session`
- 주소·위치 `/api/auth`: `GET /addresses/search`, `POST /buildings/register`, `POST /location-check`
- 팟 `/api/pods`: `POST /`, `GET /`, `GET /mine`, `GET|PATCH /{id}`, `POST /{id}/cancel`, `POST|DELETE /{id}/join`, `POST /{id}/close`, `GET /{id}/me`, `GET /{id}/participants`, `POST /{id}/paid`, `POST /{id}/picked-up`
- 정산 `/api/settlements`: `POST /receipts`, `POST /{podId}/confirm`, `GET /{podId}`
- 커뮤니티 `/api/community`: `GET|POST /posts`, `GET|DELETE /posts/{id}`, `POST /posts/{id}/comments`, `DELETE /comments/{id}`, `POST /posts/{id}/report`, `POST /comments/{id}/report`

## 알려진 제한사항 / TODO
- FEEDBACK 낮음 항목 미수정: F-4 "대표/팟장" 용어 혼용(정산·송금·픽업 화면은 "팟장"), F-5 혼자일 때 1인당 금액이 전액으로 크게 보임, F-6 송금 전에도 내 팟에서 "정산 완료", F-7 건물 미등록 계정의 403 문구, F-8 송금 현황은 주기 새로고침, F-10 GPS 실패 문장 중복, F-11 공구 제안 → 팟 개설 시 카테고리 기본값
- 코드 내 TODO 주석 없음
- 콘솔 경고: React Router v7 future flag 경고만(동작 무관)
- 로컬 QA는 Stub(주소·지오코딩·OCR)으로 돌림 → OCR은 항상 12,300원을 돌려줌. 실제 키는 `docs/API_KEYS.md`

## 다음 작업자 안내
- **로컬 실행**: `docs/SETUP.md`. 백엔드 `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew bootRun --args='--spring.profiles.active=local'`, 프론트 `cd frontend && npm install && npm run dev`(5173, `/api`·`/ws-sobun`은 8080으로 프록시). 테스트 `./gradlew test`(JDK 17), `npm run build`
- **QA 재현**: Playwright로 계정 여러 개 만들고 같은 주소 후보를 고르면 같은 건물. Stub 좌표는 37.4502, 126.6558(이 위치면 GPS 통과)
- **다음에 할 일**
  1. (선택) 낮음 항목 정리 — F-4 용어 통일부터
  2. `/pr`로 push → develop PR. develop → main 반영 방식(직접 머지/PR)과 Railway·Vercel 배포 브랜치는 사용자 확인 필요
  3. 실서버 검증. 시연용 환경변수: `LOCATION_CHECK_DEMO_MODE`, `ADDRESS_DEMO_FALLBACK`, `DEMO_SEED`(전부 기본 false)
