# 삭제 후보 목록 (임시 문서 — 삭제 작업이 끝나면 이 파일도 지운다)

_작성: 2026-11-04 · 아직 아무것도 지우지 않았음. 참조 여부는 `git grep`으로 저장소 전체(.claude/commands, .claude/hooks, .github, 코드 포함)를 확인한 결과._

## A. 문서 — 바로 지워도 되는 것 (참조는 링크만, 같이 정리하면 됨)

| 경로 | 이유 | 참조하는 곳 (같이 고칠 곳) |
| --- | --- | --- |
| `docs/REPLAN_WORK_ASSIGNMENT.md` | 2026-10 개편의 팀원별 작업 분담표. 오너가 팀 역할 분담 문서 제거를 원함. 내용은 끝난 작업 | `README.md` 문서 목록, `docs/features/05-community.md`, `docs/handoff/{README,frontend,pod-screens,session-2026-10-03}.md` 머리말, 코드 주석 `backend/.../settlement/service/JpqlSettlementPodReader.java:12` |
| `docs/PROJECT_BOARD.md` | GitHub Projects 칸반 사용법(팀 운영 문서), 해커톤 마감 단계에서 불필요 | `README.md` 문서 목록, `ONBOARDING.md` 7절(보드 링크 문단도 같이 삭제) |
| `docs/features/04-product-search.md` | 삭제된 최저가 조회 기능의 "삭제됨" 안내뿐 | **`.claude/commands/plan.md:11`, `.claude/commands/spec-check.md:14`** (파일 목록에서 빼야 함), `ONBOARDING.md` 5절 표 |
| `docs/handoff/qr-auth.md` | 삭제된 QR 인증 핸드오프 | `docs/features/01-onboarding.md:5`, `docs/handoff/settlement.md:140`, `docs/handoff/pod.md:54`, `docs/handoff/session-2026-10-03.md` |
| `docs/handoff/session-2026-10-03.md` | 10/3 하루 세션 기록, 우선순위가 이미 무효(최저가) | 없음 |
| `docs/handoff/pod-screens.md` | 10/3 프론트 머지 기록(lockfile 충돌 등), 현재 코드와 무관 | `docs/handoff/frontend.md:167`, `session-2026-10-03.md` |
| `docs/handoff/settlement-screens.md` | 10/3 정산 화면 버그 수정 기록, 내용은 코드에 반영 완료 | `session-2026-10-03.md`만 |
| `docs/design-changes.md` | 2026-10 개편 디자인 지시서(홍수진 담당 지시), PRODUCT_SPEC 6장이 대체. 식품 예시 포함 | `README.md` 문서 목록, `docs/DESIGN_HANDOFF.md:3`, `기획수정_프롬포트.md`, 코드 주석 `frontend/src/components/BottomNav.jsx:5` |
| `docs/open-decisions.md` | 임시값 목록 → PRODUCT_SPEC 11·12장(결정 기록·확인 필요)이 대체 | `README.md`, `docs/features/01,05`, `docs/handoff/community.md`, 코드 주석 `LocationCheck.java:18`, `LocationCheckService.java:19,22`, `CommunityCategory.java:4`, `CommunityModerationService.java:23`, `frontend/.../useLocationCheck.jsx:17` → 주석의 경로를 `docs/PRODUCT_SPEC.md`로 바꿔야 함 |
| `기획수정_프롬포트.md` (루트) | 2026-10 개편 때 Claude에게 준 작업 지시 프롬프트. 기획 문서가 아님, 식품 품목 기준 | `README.md`(이번에 링크 제거함), `docs/ERD.md`(이번에 제거함), `docs/REPLAN_WORK_ASSIGNMENT.md`, `docs/open-decisions.md`, `docs/features/05-community.md:21`, `docs/handoff/qr-auth.md:3`, 코드 주석 `frontend/.../BuildingConfirmPage.jsx:19` |

## B. 문서 — 지우려면 먼저 결정이 필요한 것

| 경로 | 이유 | 참조하는 곳 / 주의 |
| --- | --- | --- |
| `docs/DESIGN_HANDOFF.md` | "홍수진 담당" 역할 문서 + 식품(생수·라면·즉석밥) 예시, 화면 동작은 PRODUCT_SPEC 6장이 대체. 단 톤앤매너·설문 근거는 여기에만 있음 | `README.md`, `ONBOARDING.md`, `docs/features/01~05`, `docs/handoff/pod.md:35`, 코드 주석 `OnboardingPage.jsx:14`. 지울 거면 설문 근거 2~3줄을 PRODUCT_SPEC 3장으로 옮기기 |
| `docs/features/01-onboarding.md`, `02-pod.md`, `03-settlement.md`, `05-community.md` | 각 파일 머리에 "담당: 누구" 역할 표기 + 2026-10 기준(같은 건물, 식품 예시 일부). PRODUCT_SPEC이 상위 기준 | **`.claude/commands/plan.md`, `spec-check.md`가 이 경로를 읽음** — 지우면 두 커맨드를 `docs/PRODUCT_SPEC.md` 기준으로 바꿔야 함. 코드 주석 다수(`PodCreatePage.jsx:13`, `podUtils.js:37`, `JoinConfirmSheet.jsx:115`, `SettlementPage.jsx:83`, `CommunityListPage.jsx:76`). 지우지 않으면 "담당:" 줄만 삭제 권장 |
| `docs/handoff/frontend.md`, `docs/handoff/pod.md` | 2026-10 이전 작업 히스토리(QR·최저가·?user=2·localStorage 임시 계약 등) | `docs/handoff/community.md:5`, 코드 주석 `frontend/src/api/currentUser.js:5`, `frontend/.../podApi.js:5`. `currentUser.js`는 계정 작업으로 바뀌므로 그 뒤에 지우기 |
| `docs/handoff/` 폴더 전체 | — | **지우면 안 됨.** `.claude/hooks/require-handoff-before-push.sh:29`가 `docs/handoff/` 변경 커밋이 없으면 push를 막고, `.claude/commands/handoff.md:12`가 `docs/handoff/README.md` 템플릿을 씀. `README.md`·`settlement.md`·`community.md`는 남길 것 |

## C. 문서 안의 섹션 (파일은 남기고 부분 삭제)

| 위치 | 이유 |
| --- | --- |
| `README.md` "팀 구성" 표의 "담당 기능" 열 | 팀 역할 분담(오너 요청). 최저가 언급도 남아 있음. 이름·역할(직군)만 남기는 걸 권장 |
| `ONBOARDING.md` 5절 "담당 업무 및 목표 일정" 표 + 9/28~10/3 일정 | 팀 역할 분담 + 지난 일정, QR·최저가·04-product-search 링크 포함 |
| `ONBOARDING.md` 7절 칸반 보드 | `PROJECT_BOARD.md` 삭제 시 같이 |
| `CONTRIBUTING.md:7` 브랜치 예시 `feature/qr-auth`, `feature/product-search`, `:17` 커밋 예시 "QR 스캔 후 위치 검증" | 삭제된 기능 이름. 예시만 교체 |
| `.claude/commands/{handoff,ship,spec-check}.md:3` argument-hint의 `product`, `spec-check.md:12`의 `backend/.../product → ④` 매핑 | 없는 패키지. (`.claude/`는 문서 담당 범위 밖이라 이번에 안 고침) |

## D. 코드·설정 (문서 담당 범위 밖 — 해당 담당이 처리)

| 경로 | 이유 | 근거 |
| --- | --- | --- |
| `.env.example` 8~9행 `NAVER_SHOPPING_CLIENT_ID/SECRET` | 최저가(네이버 쇼핑) 잔재. 대신 `JUSO_API_KEY`, `KAKAO_REST_API_KEY`, `LOCATION_CHECK_DEMO_MODE`가 빠져 있음 | `git grep NAVER_SHOPPING` → `.env.example`에만 있음, 코드·yml에서 안 읽음 |
| `backend/.../auth/service/BuildingAccessService.java` + `backend/src/test/.../BuildingAccessServiceTest.java` | 개편 후 접근 가드가 `NeighborhoodService.requireNeighbor`로 바뀜. **통합 후 재확인** | 현재 `PodService`, `PodSubscriptionInterceptor`, `SettlementService`, `CommunityPostService`가 사용 중. household-pod 워크트리는 pod 쪽 사용을, community-settlement 워크트리는 community·settlement 쪽 사용을 제거 중 → 합치면 참조 0이 될 가능성 |
| `frontend/src/api/currentUser.js`의 `?user=` 처리·`DEFAULT_USER_ID = 1`·브라우저 저장 건물 | DECISIONS 5: `?user=2` 데모 장치 제거, 내 건물은 `/api/account/me`로 복구 | 계정 담당(account-login) 작업 범위 |
| `frontend/src/features/onboarding/Onboarding.module.css:1` 주석 "02 QR" | QR 화면 잔재 주석 | 주석만 |
| `frontend/src/features/pod/BuildingHomePage.jsx:15-16` `processed: '가공식품'`, `household: '생필품'` 필터 | 식품 카테고리 잔재 → `PodCategory` 칩으로 교체 대상 | pod 프론트 담당 |
| 식품 예시 문구: `EmptyPodState.jsx:52`, `communityApi.js:102,110`(생수), `CommunityWritePage.jsx:11-12`(생수·라면), `BuildingConfirmPage.jsx:8`, `OnboardingPage.jsx:15,41`(생수) | DECISIONS 1·7 문구 교체 | 각 화면 담당 |

참고: `product` 패키지·`ProductListPage`·`features/products/`는 이미 코드에서 삭제돼 있음(`git grep -i product -- backend/src frontend/src` 결과 CSS 클래스명 `.product*`(PodCompletePage, 제품 카드 의미)와 변수명 `productShare`만 남음 — 삭제 대상 아님). `frontend/public/logo.svg`는 `index.html`·`AppHeader.jsx`·`OnboardingPage.jsx`에서 사용 중이라 유지. 미사용 이미지·컴포넌트 없음(`frontend/src`의 모든 .js/.jsx가 다른 파일에서 import됨).
