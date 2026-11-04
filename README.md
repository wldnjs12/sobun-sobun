# 소분소분 (뿌리팀 · MOONG TechThon 2026)

인하대 근처(인천 미추홀구 용현동·학익동) **같은 건물 이웃**끼리 화장지·물티슈·세제 같은 생필품과 생수·라면 같은 밀봉 가공식품을 묶음으로 함께 사서, 뜯지 않은 단위 그대로 나눠 갖는 하이퍼로컬 공동구매 앱. 식재료(신선식품)는 위생·보관 리스크로 다루지 않습니다.

> 기준 문서: [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) (빌드업 데이 보완계획서 2026.10.03 + 2026-11 보완 반영)

## 팀

뿌리팀 — 최지원(PM), 문소원, 김민준, 도우현, 홍수진

## 사전 준비물

| 항목 | 버전 | 확인 명령 |
| --- | --- | --- |
| JDK | 17 이상 | `java -version` |
| Node.js | 20 이상 | `node -v` |
| PostgreSQL | 14 이상 (로컬 실행) | `psql --version` |
| GitHub CLI (`gh`) | 최신 | `gh --version` (PR 생성용, 필수는 아님) |

## 기술 스택

- 백엔드: Spring Boot 3 (Java 17), Spring Data JPA, WebSocket(STOMP), PostgreSQL
- 프론트엔드: React + Vite, react-router-dom, @stomp/stompjs
- 외부 연동: Naver Clova OCR(영수증 인식), 도로명주소 API(Juso, 주소 검색), 카카오 로컬 API(주소 → 좌표 변환) — 발급 안내: [docs/API_KEYS.md](./docs/API_KEYS.md)

> 사업계획서 대비 기술 정정: Node.js/Express + Socket.io → **Spring Boot 3 + STOMP WebSocket**, 네이버 쇼핑 API(최저가 조회, 삭제) → **도로명주소 API + 카카오 좌표 변환 API**(건물 인증).

## 핵심 기능 (해커톤 MVP)

1. 계정(아이디·비밀번호) 로그인 + 주소(1차)·GPS(2차) 건물 인증
2. 건물 단위 격리 — 팟·정산·실시간 채널·커뮤니티 모두 같은 건물만 (ID 직접 접근도 403)
3. 팟 개설·참여·수정·취소, 검색·카테고리 필터, 1인당 금액 실시간 갱신, 미개봉 단위 나눔 (예: 화장지 30롤 → 1인 10롤씩, 생수 2L×24병 → 1인 6병 1팩씩)
4. 영수증 OCR + 대표 수고비(기본 5%) 반영 자동 정산, 송금 링크·자가 신고, 비대면 픽업
5. 건물별 익명 커뮤니티 ("이웃 N" 익명, 신고 3회 자동 숨김, 공구 제안 → 팟 개설)
6. 시연 안정성 플래그: `LOCATION_CHECK_DEMO_MODE`, `ADDRESS_DEMO_FALLBACK`, `DEMO_SEED` (기본 꺼짐)

## 실행 방법

### 백엔드
```bash
cd backend
# PostgreSQL을 로컬에 띄우고 application.yml의 접속 정보를 맞춰주세요.
./gradlew bootRun   # 또는 IntelliJ에서 backend 폴더를 열고 SobunsobunApplication 실행
```
백엔드는 IntelliJ에서 열 때 저장소 최상위가 아니라 **`backend` 폴더 자체**를 열어야 build.gradle을 인식합니다.

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

## 폴더 구조

```
backend/   Spring Boot (기능별 패키지: auth(계정 포함), pod, settlement, community, global)
frontend/  React + Vite (기능별 폴더: features/onboarding, pod, settlement, community, mypage)
docs/      제품 명세, API 명세, ERD, 설정·배포 가이드
.claude/   Claude Code 팀 공유 설정 (커스텀 명령어, 브랜치 보호 훅)
```

## 문서

- [CONTRIBUTING.md](./CONTRIBUTING.md) — 브랜치 전략, 커밋 컨벤션, PR 규칙
- [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) — **제품 명세(기준 문서)**: 화면별 동작, 위치·주소 정책, 거래 흐름, 결정 기록
- [docs/API_SPEC.md](./docs/API_SPEC.md) — API 명세
- [docs/ERD.md](./docs/ERD.md) — 데이터베이스 구조
- [docs/DESIGN_HANDOFF.md](./docs/DESIGN_HANDOFF.md) — 톤앤매너·화면 구성 참고
- docs/features/ — 기능별 상세 스펙(배경 참고용, PRODUCT_SPEC 우선) ([①온보딩](./docs/features/01-onboarding.md) · [②팟](./docs/features/02-pod.md) · [③정산](./docs/features/03-settlement.md) · [⑤커뮤니티](./docs/features/05-community.md))
- [docs/SETUP.md](./docs/SETUP.md) — 로컬 개발 환경 설정 가이드
- [docs/DEPLOY.md](./docs/DEPLOY.md) — 배포 가이드 (Supabase + Railway + Vercel)
- [docs/API_KEYS.md](./docs/API_KEYS.md) — 외부 API 키 발급 안내
- [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) — 발표/데모 시나리오
- [CLAUDE.md](./CLAUDE.md) — Claude Code가 이 프로젝트에서 지켜야 할 규칙 (팀원 로컬 Claude Code에서 자동으로 읽힘)
- [ONBOARDING.md](./ONBOARDING.md) — 팀원 온보딩 가이드 (클론부터 첫 브랜치까지)

## Claude Code 사용자라면

이 저장소를 `git clone` 해서 로컬 Claude Code(`claude`)로 열면 아래가 자동으로 적용됩니다.

- `/commit` — 브랜치 확인 + 컨벤션에 맞는 커밋
- `/pr` — 현재 feature 브랜치 push + develop으로 PR 생성
- `main`/`develop`에 직접 commit·push를 시도하면 훅이 자동으로 막습니다

처음 열 때 Claude Code가 "이 프로젝트 설정을 신뢰하시겠습니까" 같은 확인을 한 번 물어볼 수 있어요 — 우리 팀이 커밋한 `.claude/` 설정이니 승인하면 됩니다.
