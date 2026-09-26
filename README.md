# 소분소분 (뿌리팀 · MOONG TechThon 2026)

같은 건물 이웃과 대용량 식재료를 QR+GPS로 인증한 뒤 함께 사서 원가로 나누는 하이퍼로컬 공동구매 앱.

## 팀 구성

| 이름 | 역할 | 담당 기능 |
| --- | --- | --- |
| 최지원 (PM) | 기획, 백엔드 | ② 팟 개설·실시간 정산 (리드) |
| 문소원 | 백엔드, 프론트엔드 | ① 온보딩(백), ③ 수고비 정산(백) |
| 김민준 | 발표, 백엔드, 프론트엔드 | ① 온보딩(프론트), ④ 최저가 조회(백) |
| 도우현 | 프론트엔드, 백엔드 | ② 팟(프론트), ④ 최저가 조회(프론트) |
| 홍수진 | 디자인, 프론트엔드 | 전체 디자인 시스템, ③ 수고비 정산(프론트) |

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
- 외부 연동: Naver Clova OCR(영수증 인식), 네이버 쇼핑 검색 API(최저가 조회)

> 사업계획서상 Node.js/Express 표기는 구현 예시이며, 팀 실제 역량에 맞춰 Spring Boot로 통일했습니다.

## 핵심 기능 (해커톤 MVP)

1. QR+GPS 건물 인증 온보딩
2. 팟 개설·참여·실시간 정산 갱신
3. 대표 수고비(정률) 반영 자동 정산식
4. 최저가 조회 기반 상품 리스트 제공

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
backend/   Spring Boot (기능별 패키지: auth, pod, settlement, product, global)
frontend/  React + Vite (기능별 폴더: features/onboarding, pod, settlement, products)
docs/      ERD, API 명세 초안
.claude/   Claude Code 팀 공유 설정 (커스텀 명령어, 브랜치 보호 훅)
```

## 문서

- [CONTRIBUTING.md](./CONTRIBUTING.md) — 브랜치 전략, 커밋 컨벤션, PR 규칙
- [docs/ERD.md](./docs/ERD.md) — 데이터베이스 구조 초안
- [docs/API_SPEC.md](./docs/API_SPEC.md) — API 명세 초안
- [CLAUDE.md](./CLAUDE.md) — Claude Code가 이 프로젝트에서 지켜야 할 규칙 (팀원 로컬 Claude Code에서 자동으로 읽힘)

## Claude Code 사용자라면

이 저장소를 `git clone` 해서 로컬 Claude Code(`claude`)로 열면 아래가 자동으로 적용됩니다.

- `/commit` — 브랜치 확인 + 컨벤션에 맞는 커밋
- `/pr` — 현재 feature 브랜치 push + develop으로 PR 생성
- `main`/`develop`에 직접 commit·push를 시도하면 훅이 자동으로 막습니다

처음 열 때 Claude Code가 "이 프로젝트 설정을 신뢰하시겠습니까" 같은 확인을 한 번 물어볼 수 있어요 — 우리 팀이 커밋한 `.claude/` 설정이니 승인하면 됩니다.
