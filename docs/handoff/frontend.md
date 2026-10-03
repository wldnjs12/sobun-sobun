# 핸드오프: 프론트엔드 전체 (① 온보딩 · ② 팟 · ③ 정산 · ④ 최저가 · 마이페이지)

> ⚠️ **기획 개편 전 기록(2026-10-03 이전)**: ①온보딩(QR)과 ④최저가는 기획 개편으로 삭제/교체됩니다. 이 문서는 과거 작업 히스토리로만 보존하며, 최신 기획은 [REPLAN_WORK_ASSIGNMENT.md](../REPLAN_WORK_ASSIGNMENT.md)·[design-changes.md](../design-changes.md)를 참고하세요.

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

### ⚠️ 목업 상태 (백엔드 ① 완성 전)
- `features/onboarding/onboardingApi.js` 맨 위 **`USE_MOCK = true`** — 최지원 ① PR 머지되면 **`false`로 한 줄만** 바꾸면 실제 API(`/auth/addresses/search`, `/auth/buildings/register`, `/auth/location-check`) 사용
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
- 백엔드 ① 붙으면: 실제 주소 API 응답 형태 확인, 다른 건물 팟 접근 시 403 화면 처리 필요
- 검증: 헤드리스 Chrome으로 19개 항목 자동 확인 (빌라·아파트·동 직접입력 등록, 미등록 접근 차단, 팟 개설 GPS 통과 → 생성, 반경 밖·권한 거부·위치 못 받음 시트, 위치 잡힌 뒤 [다시 확인] → 참여 성공), JS 에러 없음

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
