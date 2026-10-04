# 핸드오프: 프론트엔드 전체 (① 온보딩 · ② 팟 · ③ 정산 · ④ 최저가 · 마이페이지)

> ⚠️ **기획 개편 전 기록(2026-10-03 이전)**: ①온보딩(QR)과 ④최저가는 기획 개편으로 삭제/교체됩니다. 이 문서는 과거 작업 히스토리로만 보존하며, 최신 기획은 [REPLAN_WORK_ASSIGNMENT.md](../REPLAN_WORK_ASSIGNMENT.md)·[design-changes.md](../design-changes.md)를 참고하세요.

---

## 🆕 상단 헤더 연결 + 알림 화면 (2026-10-04 · 최지원 · feature/header-navigation)

헤더(`components/AppHeader.jsx`, 팟·커뮤니티·내 팟·마이 공통)의 건물명·알림·로고가 눌러도 아무 데도 안 가던 것을 연결.

| 누르는 곳 | 이동 | 비고 |
| --- | --- | --- |
| 건물명 | `/onboarding/address` (주소 검색) | 다른 건물을 고르면 소속이 바뀜 — 서버 `POST /auth/buildings/register`가 이미 재등록(이사) 지원 |
| 🔔 알림 | `/notifications` (신규) | 아래 참고 |
| 로고 | `/home` (건물 홈) | 이전엔 `/mypage`였음 (송금 화면 PR에서 바꿨던 것) — 마이는 하단 탭으로 감 |

**알림 화면 (`features/mypage/NotificationsPage.jsx`)**
- 알림 전용 기획·디자인·API가 없어서, "내 팟" 탭과 같은 데이터(`useMyPods` = 이 브라우저에서 참여한 팟 + `GET /settlements/{podId}`)로 **지금 할 일이 있는 팟 소식**만 모아 보여줌. 새 백엔드 없음
- 규칙(위에서부터 먼저 맞는 것): 정산 확정 → 팟장 "송금 현황 확인"(`/settlements/{id}/payments`), 참여자 "1인당 N원 송금해주세요"(`/settlements/{id}/result`) · 마감됨 → 팟장 "영수증 등록", 참여자 "정산 기다리는 중"(`/pods/{id}/complete`) · 인원 다 모임 → 팟장 "마감하세요", 참여자 "곧 마감"(`/pods/{id}`) · 모집 중이면 소식 없음
- 한계: 푸시가 아니라 "현재 상태" 기준이라 시간·읽음 표시 없음. 내 팟과 마찬가지로 다른 기기에서 참여한 팟은 안 보임
- `useMyPods` 결과에 `settlement` 필드 추가 (기존 `pod`, `status`는 그대로)
- `AppHeader`는 공용 컴포넌트라 REPLAN_WORK_ASSIGNMENT 규칙대로 팀 채팅에 알릴 것

**확인**: Vite 개발 서버 + 브라우저에서 API 응답을 가짜 데이터로 바꿔 확인 — 팟 5개(팟장 정산확정/참여자 정산확정/참여자 마감/팟장 인원 다 모임/모집 중)에서 소식 4개가 위 규칙대로 나오고 모집 중은 빠짐, 링크 경로 일치. 빈 상태 화면, 로고(마이→홈), 건물명(→주소 검색) 이동 확인. 실제 백엔드 연동 확인은 못 함 (작업 PC에 Postgres 없음)

---

## 🆕 ④ 최저가 프론트 삭제

_최종 갱신: 2026-10-03 · 브랜치: feature/remove-products-frontend · 담당: 도우현 (REPLAN 작업표의 "④최저가(프론트) 삭제")_

- `frontend/src/features/products/` 폴더(`ProductListPage.jsx`·`.module.css`)와 `App.jsx`의 `/products` 경로 삭제. 하단 탭에서는 이미 빠져 있었음
- 예전 링크로 `/products`에 들어오면 없는 주소 규칙(`*` → `/`)에 따라 시작 화면으로 감
- 최저가 **백엔드**(`product` 패키지) 삭제는 김민준 PR #22에서 진행 — 이 PR과 별개
- 검증: 빌드 통과, `/products` 직접 접속 → `/`, 홈·하단 탭(팟/커뮤니티/내 팟/마이) 정상, JS 에러 없음

---

## 🆕 기획 개편 후: ① 온보딩 프론트 (주소 + GPS)

_최종 갱신: 2026-10-03 · 브랜치: feature/onboarding-address · 담당: 도우현 · 백엔드 계약: [API_SPEC.md](../API_SPEC.md) ①_

### 한 일
- **QR 인증 삭제**: `QrScanPage.jsx`, `VerifyLocationPage.jsx`, PR #9 데모 인증코드·복사 UI까지 전부 제거
- **S1' 주소 검색** `/onboarding/address` (`AddressSearchPage.jsx`) — 입력 전 / 검색 중 / 결과 / 결과 없음
- **S1'' 건물 확인·동 선택** `/onboarding/confirm` (`BuildingConfirmPage.jsx`) — 빌라(동 없음) / 아파트 동 목록 / 동 목록 없으면 직접 입력
- **S2' GPS 인라인 확인 + S3 실패 바텀시트 3종** — `useLocationCheck.jsx` 훅 + `LocationCheckSheet.jsx`. 팟 개설(`POD_CREATE`)·참여 확정(`POD_JOIN`)에 연결
- 등록한 건물을 "내 건물"로 저장(`api/currentUser.js`의 `setMyBuilding/getMyBuilding`) → `podApi.BUILDING`이 그 값을 읽음(헤더 건물명 등). 건물 미등록이면 `/home` 등 접근 시 시작 화면으로 (`App.jsx`의 `RequireBuilding`)
- 시작 화면 문구 개편(우리 건물 이웃 · 화장지 30롤 예시), 팟 생성의 "최저가에서 가져왔어요" → "커뮤니티 제안에서 가져왔어요"
- **버그 수정**: 팟 생성 금액 입력이 `step="100"`이라 21,990원 같은 실제 가격을 브라우저가 거절하고 제출이 안 되던 문제 → `step="1"`

### ✅ 실제 서버 연결 (2026-10-03, PR #17 머지 후)
- `features/onboarding/onboardingApi.js`의 **`USE_MOCK = false`** — 실제 API(`/auth/addresses/search`, `/auth/buildings/register`, `/auth/location-check`) 사용
  - ⚠️ 실제 서버에서 `true`로 두면 안 됨: 목업 등록은 서버에 건물 소속이 안 남아서 팟 목록이 전부 403으로 막힘
  - 백엔드에 주소·지오코딩 키가 없으면 서버가 Stub을 씀: 주소 검색은 고정 후보 2건(용현 한아름아파트·학익 다세대주택), 건물 좌표는 인하대(37.4502, 126.6558) → 크롬 Sensors로 이 좌표를 지정하면 GPS 통과
  - 실제 서버로 데모 시나리오 확인: 등록 → GPS 통과 팟 개설 → 같은 건물 참여·실시간 → 다른 건물은 목록에 안 보이고 링크 접근 시 403 화면, WebSocket 구독 거부 후 재연결 안 함 → 다른 위치에서 개설 시 서버 OUT_OF_RANGE 시트
- **🛠 로컬 DB에 예전(QR 시절) 건물 데이터가 있으면** 서버가 `building.building_key`(NOT NULL) 컬럼을 못 만들어 건물 등록이 JDBC 에러로 실패함. 데이터 지우지 않고 해결:
  ```sql
  ALTER TABLE building ADD COLUMN IF NOT EXISTS building_key varchar(255);
  UPDATE building SET building_key = 'legacy-' || id WHERE building_key IS NULL;
  ALTER TABLE building ALTER COLUMN building_key SET NOT NULL;
  ```
  실행 후 백엔드 재시작. (새로 만든 DB·배포 DB는 해당 없음)

### (참고) 목업 모드 — 백엔드 없이 화면만 볼 때 `USE_MOCK = true`
- 목업 주소: "인하로", "학익", "용현" 등으로 검색 (제니스빌·인하하우스·학익한마음아파트·용현그린아파트 — 가짜 주소). 그 밖에 **아무 주소나 입력해도 입력한 글자 그대로 후보 1개**가 나옴 ("아파트"가 들어 있으면 아파트로 보고 101~103동 목록)
- 목업 등록은 어떤 건물이든 `buildingId: 1`로 묶음 (지금 팟 API가 건물 1번 기준이라)
- GPS는 목업이어도 **브라우저 위치는 실제로 받음** → 권한 거부/위치 못 받음(b)(c)은 진짜로 확인 가능. 반경 밖(a)은 주소 뒤에 `?mockGps=out`을 붙여 연 탭에서 흉내 냄

### 👉 김민준님(⑤ 커뮤니티 입장)에서 GPS 확인 쓰는 법
```jsx
import useLocationCheck from '../onboarding/useLocationCheck.jsx'

const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()
<button disabled={checking} onClick={() => runWithLocationCheck('COMMUNITY_ENTER', enterCommunity)}>
  {checking ? '위치를 확인하고 있어요…' : '커뮤니티 입장'}
</button>
{locationSheet}  {/* 실패 시 바텀시트 — 화면 어디든 한 번만 넣으면 됨 */}
```
- 통과하면 `enterCommunity()`가 실행되고, 실패하면 시트가 뜨고 [다시 확인]이 같은 동작을 다시 시도함. 결과는 캐시하지 않음(매번 확인)
- 공구 제안 → 팟 생성으로 넘길 때: `navigate('/pods/new', { state: { title: '생수 2L 24병' } })` → 생성 화면에 품목이 채워지고 "커뮤니티 제안에서 가져왔어요" 표시

### 남은 것 / 확인 필요
- ✅ **하단 탭 `[팟·커뮤니티·내 팟·마이]` 변경 완료** (브랜치 `feature/bottom-nav-tabs`, 도우현이 맡기로 함)
  - "내 팟" 탭 `/my-pods` (`features/mypage/MyPodsPage.jsx`) — 마이페이지의 참여 내역을 분리, 상태별 필터. 데이터는 `useMyPods.js` 훅으로 마이 탭과 공유
  - "마이" 탭 — 요약 숫자 + "내 팟" 바로가기 + 내 건물 변경만 남김
  - **"커뮤니티" 탭 `/community`는 임시 "준비 중" 화면**(`components/ComingSoonPage.jsx`) → **@김민준: 커뮤니티 화면이 생기면 `App.jsx`의 `/community` 라우트 element만 그 화면으로 바꾸면 됨** (탭 쪽은 손댈 필요 없음)
  - 최저가 탭은 내림. `/products` 라우트·파일 삭제는 김민준님 커뮤니티 PR 담당 그대로
- 백엔드 ① 붙으면: 실제 주소 API 응답 형태 확인
- ✅ **다른 건물 접근 차단 화면 완료** (브랜치 `feature/building-access-denied`) — API_SPEC의 `403 BUILDING_ACCESS_DENIED` 계약 기준
  - 팟 조회에 `userId` 추가: `GET /pods?buildingId=&userId=`, `GET /pods/{id}?userId=` (`podApi.js`) — 픽업 화면 등 `fetchPod`를 쓰는 곳은 자동 적용
  - WebSocket 연결에 `X-User-Id` 헤더, 서버가 구독을 거부하면 재연결을 멈추고 `onDenied` 호출 (`api/socket.js`)
  - 팟 상세·모집 완료: 403이면 "다른 건물의 팟이에요" 화면(`components/AccessDeniedView.jsx`). 건물 홈 목록 403이면 "건물 정보가 서버와 맞지 않아요 → 다시 등록" 안내
  - **@홍수진·@문소원(③ 정산 화면), @김민준(⑤ 커뮤니티)도 같은 화면을 쓰면 됨:**
    ```jsx
    import { isBuildingAccessDenied } from '../../api/client.js'
    import AccessDeniedView from '../../components/AccessDeniedView.jsx'
    // 에러를 e.message가 아니라 e(객체)로 보관해야 구분 가능
    if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="정산" what="팟" />   // 커뮤니티면 what="글"
    ```
  - ③ 정산 API(`settlementApi.js`)에 `userId` 쿼리 추가는 정산 담당 파일이라 안 건드림 — API_SPEC ③대로 `confirm`/`GET /settlements/{podId}`에 `?userId=` 필요
  - 검증: 서버 403을 테스트에서 가로채 흉내 내어 확인 (팟 상세·모집 완료·목록 403 화면, 500은 기존 에러 문구 유지, userId 쿼리 전송). 실제 서버 403·WebSocket 구독 거부는 백엔드 가드 머지 후 재확인 필요
- 검증: 헤드리스 Chrome으로 19개 항목 자동 확인 (빌라·아파트·동 직접입력 등록, 미등록 접근 차단, 팟 개설 GPS 통과 → 생성, 반경 밖·권한 거부·위치 못 받음 시트, 위치 잡힌 뒤 [다시 확인] → 참여 성공), JS 에러 없음

---

## 🆕 ③ 송금 화면 (Stitch "stitch_new_starter_project 2" _1~_5) + 헤더 로고

_최종 갱신: 2026-10-03 · 브랜치: feature/payment-screens · 담당: 도우현 (정산 UI 담당 홍수진이 보낸 디자인, 백엔드는 이미 있던 API 사용 — 서버 변경 없음)_

### 한 일
- **_4 정산 확정(팟장)** `SettlementPage` 금액 확인 단계: "내 송금 링크 또는 계좌 (선택)" 입력 → `confirm`의 `hostPaymentLink`로 전송. 입력 즉시 "이웃에게는 [토스로 송금] 버튼으로 보여요" 미리보기, "다음 정산에도 기본으로 사용" 체크 시 브라우저에 기억(`sobun.paymentLink.{userId}`)
- **정산 결과** `SettlementResultPage` — 보는 사람별로 달라짐
  - 참여자 _1: 내가 보낼 금액, 절약 금액, 송금 카드(토스/카카오페이 링크 버튼 또는 계좌번호+복사) + **[보냈어요]** → `POST /pods/{id}/paid`
  - 참여자 _5: 팟장이 송금 정보를 안 남겼으면 "아직 등록하지 않았어요" + 새로고침, [보냈어요] 잠김
  - 참여자 _2: 보낸 뒤 "송금 확인을 요청했어요 ✨" + 진행 단계 + [픽업 안내 보기] (상태는 `GET /pods/{id}/me`의 `paid`라 새로고침해도 유지)
  - 팟장: 이웃에게 보이는 송금 정보 + [송금 현황 보기]
- **_3 송금 현황(팟장 전용)** 새 화면 `/settlements/:podId/payments` (`PaymentStatusPage`) — `GET /pods/{id}/participants`로 "이웃 N명 중 M명 송금 완료", 진행 막대, 이웃별 보냈어요/대기 중. 실시간 이벤트가 없어서 **10초마다 다시 조회** + 수동 새로고침. userId 대신 "이웃 1, 2…"로 표시
- `paymentLink.js`: 송금 정보 글자 → 버튼 종류 판별(toss→토스, kakaopay→카카오페이, 그 외 https→링크, 나머지→계좌). http/https만 링크로 엶(`javascript:` 차단). 복사는 http(휴대폰 내부망 접속)에서도 되게 예전 방식으로 대체
- `podApi.js`에 `markPaid`, `fetchParticipants` 추가 / `settlementApi.confirmSettlement`에 `hostPaymentLink`
- **헤더 로고**: `AppHeader` 우측 프로필(사람 아이콘) → 앱 로고(`/logo.svg`), 누르면 `/mypage`
- 디자인에서 뺀 것: [콕 찌르기]·[미송금 이웃 일괄 알림]·[대표 알림 찌르기](알림 API 없음), 신뢰도 ★4.9, 에스크로 문구, D-1 마감

### 알아둘 것
- 앱은 실제 입금을 확인하지 않음 — [보냈어요]는 자가 신고, 팟장이 은행/토스 앱에서 직접 확인 (화면에 안내 문구 있음)
- 송금 정보는 확정 때만 넣을 수 있음(서버에 수정 API 없음). 빠뜨리면 이웃은 [보냈어요]를 못 누름 → 팟장 결과 화면에 경고 표시

### 검증
- 로컬 백엔드(데모 모드) + 헤드리스 Chrome 14개 항목: 확정 전 참여자 안내, 링크 입력·미리보기·기본값 저장, 확정 후 팟장 화면, 송금 현황 0명→1명, 참여자 토스 링크(https·새 창), 보냈어요 → 송금 완료 화면, 새로고침 유지, 송금 정보 없음(_5) 잠김, 헤더 로고 → 마이페이지. JS 에러 없음

---

## 🆕 ⑤ 커뮤니티 프론트 + 온보딩 새 디자인 (Stitch s1_1·s1_2·s16·s17)

_최종 갱신: 2026-10-03 · 브랜치: feature/community-and-onboarding-design · 담당: 도우현 (팀 합의로 커뮤니티 프론트도 도우현, 백엔드는 김민준)_

### 한 일
- **S16 목록** `/community` · **S17 상세** `/community/posts/:id` · **S18 글쓰기** `/community/write` (`features/community/`)
  - 카테고리 칩(전체/공구 제안/나눔/질문/자유), 검색(불러온 글 안에서 글자 필터 — 서버 검색 API 없음), 공구 제안 배너, 글쓰기 버튼
  - 상세: "글쓴이"·"이웃 N" 익명 표시, 댓글, ⋯ 메뉴(내 것=삭제 / 남의 것=신고 → "신고했어요" 토스트), 공구 제안이면 [팟 개설하기] → `/pods/new`에 첫 줄을 품목명으로 채워 이동
  - **입장 GPS 확인**(`COMMUNITY_ENTER`, `useCommunityEntry.js`): 탭으로 들어오거나 새로고침·링크로 열면 매번 확인, 상세에서 뒤로가기로 목록 복귀할 땐 다시 안 물음(React Router 이동 종류 POP/PUSH로 구분). 실패하면 글이 안 보이고 "위치 확인이 필요해요" + 실패 시트
  - 403(다른 건물)이면 `AccessDeniedView`
- **온보딩 새 디자인**: 주소 검색(s1_2), 건물 확인(s1_1) — 단계 표시, 건물 카드, 동 칩 + "직접입력", **이웃 약속 2개 동의해야 시작**
- 디자인에서 뺀 것(근거 없는 숫자·기획 위반): **호수 입력**(기획상 호수 안 받음), "GPS 100% 일치·반경 50m", 이웃 수·진행 팟 수·좋아요·조회수·사진·매너온도
- 하단 탭의 임시 "준비 중" 화면(`ComingSoonPage`) 삭제 → 실제 커뮤니티로 교체

### ⚠️ 목업 상태 + 👉 @김민준(⑤ 백엔드) 맞춰주세요
- `features/community/communityApi.js` 맨 위 **`USE_MOCK = true`** → ⑤ 백엔드 머지되면 `false`
- 목업 샘플 글은 **처음 커뮤니티를 연 건물**의 글이 됨 (실제 건물 id는 등록 때 서버가 정해서 미리 모름). 다른 건물은 빈 커뮤니티로 시작 → 건물 분리가 보임. **데모 때는 데모 건물(팟장 폰)에서 커뮤니티를 먼저 열 것**
- API_SPEC ⑤에 응답 필드가 다 적혀 있지 않아서 프론트가 아래 모양을 **가정**함. 백엔드를 이렇게 맞추거나, 다르면 알려주세요:
  ```
  CommunityPostSummary = { id, category, content, commentCount, createdAt, mine }
  CommunityPostDetail  = { id, category, content, createdAt, mine, suggestable,
                           comments: [{ id, content, createdAt, authorLabel, mine }] }
  ```
  - `authorLabel`: "글쓴이" / "이웃 1"… (API_SPEC 익명화 규칙), `mine`: 내 글·댓글 여부(삭제 버튼용). 작성자 id는 응답에 없음
  - 제목 칸이 없어서 **content 첫 줄을 제목처럼** 보여줌
- 목업은 서버 규칙을 흉내 냄(익명 번호 계산, 같은 사람 중복 신고 무시, 3회 신고 숨김, 내 글만 삭제). localStorage에 저장돼서 같은 브라우저의 다른 탭(`?user=2`)과 공유됨 → 다른 사용자 데모 가능

### 검증
- 헤드리스 Chrome 27개 항목: 온보딩(학익동 칩 검색 → 동 선택·직접입력 → 약속 미동의 시 비활성 → 등록), 커뮤니티(입장 GPS → 목록, 나눔 필터, 검색, 상세 익명 표시, 댓글 "이웃 2 (나)", 신고 토스트, 팟 개설 연결, 글쓰기 빈 내용 에러, 다른 사용자에게 보임, 3명 신고 → 숨김, 내 글 삭제, GPS 반경 밖 → 글 숨김 + 시트). JS 에러 없음

---

## (개편 전 기록) 이번 작업 요약

_당시 최종 갱신: 2026-10-03 · 브랜치: feature/onboarding-settlement-ui (← feature/pod-screens, PR #4)_

Stitch 디자인(`stitch_new_starter_project/`) 16개 화면을 모두 구현하고, 머지된 백엔드 3개(①②③)에 연동했다.

| Stitch | 화면 | 주소 | 파일 |
| --- | --- | --- | --- |
| 01 | 시작 | `/` | `features/onboarding/OnboardingPage.jsx` |
| 02 | QR 스캔 | `/onboarding/scan` | `QrScanPage.jsx` |
| 03·04 | 위치 확인 · 인증 실패 | `/onboarding/verify` (`?qr=토큰` 지원) | `VerifyLocationPage.jsx` |
| 05·16 | 건물 홈 · 빈 상태 | `/home` | `features/pod/BuildingHomePage.jsx` |
| 06 | 팟 생성 | `/pods/new` | `PodCreatePage.jsx` |
| 07·08 | 팟 상세 · 참여 확인 | `/pods/:id` | `PodDetailPage.jsx`, `JoinConfirmSheet.jsx` |
| 09 | 모집 완료 (팟장 마감) | `/pods/:id/complete` | `PodCompletePage.jsx` |
| 10·11 | 영수증 업로드 · 금액 확인 | `/settlements/:id` | `features/settlement/SettlementPage.jsx` |
| 12 | 정산 결과 | `/settlements/:id/result` | `SettlementResultPage.jsx` |
| 13 | 비대면 픽업 | `/pods/:id/pickup` | `PickupPage.jsx` |
| 14 | 최저가 조회 | `/products` | `features/products/ProductListPage.jsx` |
| 15 | 마이페이지 | `/mypage` | `features/mypage/MyPage.jsx` |

**앱 로고**: `frontend/public/logo.svg` (4칸 소분 큐브). 시작 화면(01) 왼쪽 위 + 브라우저 탭 아이콘(`index.html` favicon)에 사용. 16px 탭 아이콘에서는 여백 때문에 작게 보여서, 필요하면 여백 줄인 전용 버전을 따로 만들 것.

**같이 고친 버그**
- 실시간 갱신이 처음부터 연결 안 됨: 백엔드 `/ws-sobun`이 SockJS라 순수 WebSocket은 `/ws-sobun/websocket`으로 붙어야 함 (`api/socket.js`)
- 1인당 금액이 1원 더 나옴: `총액 × 1.05` 부동소수점 오차 → 정수 %로 계산하도록 수정, 백엔드 식과 142만여 조합 차이 0건 확인 (`podUtils.js`)

## 기획 대비 확인 (spec-check)

**일치**
- ① 반경 50m 판정은 서버, 프론트는 에러 `code`(INVALID_QR/EXPIRED_QR/OUT_OF_RANGE)로 분기하고 `message`는 그대로 표시. 위치 권한 거부는 요청 전 별도 안내
- ② 금액식·수동 마감·마감 전까지만 참여 취소 — `pod.md` 계약 그대로
- ③ OCR 실패(`success=false`) → 금액 직접 입력으로 전환. 확정 금액 = 원가 × (1+수고비율), 1인당 올림 — 미리보기도 같은 식
- ④ 가격 오름차순, 결과 없음/에러 안내, 실패해도 팟 생성으로 갈 수 있음

**의도적으로 단순화/변경**
- 디자인 중 기획·API에 없는 것(에스크로 송금, 자동 환불, 채팅방, 입고요청 투표, 누적 절약 통계, 인증 실패 시 "280m 떨어짐" 거리 표시)은 사용자에게 틀린 정보가 돼서 넣지 않음
- 13 픽업의 보관함 번호·비밀번호: API가 없어서 "보관 후 알려드려요"로 표시 (가짜 비밀번호를 보여주면 사용자가 실제로 누를 수 있어서)
- QR 스캔은 브라우저 내장 `BarcodeDetector` 사용(라이브러리 추가 없음). iOS Safari처럼 지원 안 하는 곳은 "인증 코드 직접 입력" 또는 휴대폰 기본 카메라로 `…/onboarding/verify?qr=토큰` 링크 QR을 찍는 방식으로 대체

**재확인 필요**
- 수고비율 선택(0/3/5/8%) 허용 여부 — 02-pod.md "팀 논의"

## API 표면 (프론트가 호출하는 것)

| 기능 | 호출 |
| --- | --- |
| ① 인증 | `POST /auth/verify` + 헤더 `X-User-Id` |
| ② 팟 | `GET /pods?buildingId=`, `GET /pods/{id}`, `POST /pods`(→ 팟장 자동 `join`), `POST /pods/{id}/join?userId=`, `POST /pods/{id}/close?hostUserId=`, WS `/ws-sobun/websocket` → `/topic/pods/{id}` |
| ③ 정산 | `POST /settlements/receipts`(multipart `receipt`), `POST /settlements/{podId}/confirm` |
| ④ 최저가 | `GET /products/search?keyword=` |

## 알려진 제한사항 / TODO (백엔드 협의 필요한 것 위주)

| 문제 | 지금 처리 | 필요한 것 |
| --- | --- | --- |
| 로그인 없음 | `?user=2`로 탭마다 사용자 구분 (`api/currentUser.js`) | 세션 붙으면 이 파일 삭제 |
| `/auth/verify`가 `true`만 반환 | 건물은 id=1로 고정 (`podApi.BUILDING`) | 응답에 `buildingId`, 건물명 포함 (① 문소원) |
| 내 참여 팟 / 인증 여부 / 정산 결과를 다시 조회하는 API 없음 | 이 브라우저 localStorage에 기억 → **다른 기기의 참여자는 정산 결과를 못 봄** | `GET /pods?userId=`, `GET /settlements/{podId}` (②③) |
| 보관함 번호·비밀번호 | "보관 후 알려드려요" | 저장/조회 API (③) |
| `ProductSearchService` 스텁 | 최저가 화면에 에러 안내 | ④ 김민준 구현 |
| QR 스캔 화면에 **데모 인증코드(`demo-qr-token`) + 복사 버튼** 노출 | 데모 편의용 (`QrScanPage.jsx`의 `DEMO_QR_TOKEN`, DB `qr_token`과 같아야 함) | **실서비스 전 반드시 제거** — QR 토큰을 화면에 공개하는 셈 |

## 다음 작업자 안내

**실행**
1. 백엔드: `cd backend && ./gradlew bootRun`
2. DB에 건물 1개 (QR 인증·팟 생성에 필요):
   ```sql
   INSERT INTO building (name, latitude, longitude, qr_token, qr_token_expires_at)
   VALUES ('신촌 청년드림빌', <데모 장소 위도>, <데모 장소 경도>, 'demo-qr-token', NULL);
   ```
   ⚠️ 위경도는 **데모를 하는 장소** 좌표여야 50m 인증이 통과됨
3. 프론트: `cd frontend && npm install && npm run dev` → `http://localhost:5173/`

**데모 흐름 (탭 3개 = 사용자 3명)**
- 팟장 `/?user=1` → 인증(코드 `demo-qr-token` 직접 입력) → 팟 생성(3명)
- 이웃 `/home?user=2`, `/home?user=3` → 참여 → 팟장 화면 실시간 갱신 → 팟장 마감 → 영수증 업로드 → 정산 결과 → 픽업
- 네이버 OCR 키가 없으면 백엔드 Stub이 항상 12,300원으로 인식함

**검증 기록**: 머지된 백엔드 3개를 띄우고 헤드리스 Chrome으로 위 흐름 전체 23개 항목 자동 확인 (GPS 반경 안/밖, 잘못된 QR, 참여자 정산 차단, 금액 수정 재계산, DB에 인증·정산 기록 저장까지), JS 에러 없음
