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
./gradlew bootRun   # 또는 IntelliJ에서 SobunsobunApplication 실행
```
(gradlew이 없다면 IntelliJ로 프로젝트를 열면 자동으로 Gradle Wrapper를 만들어줍니다.)

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
```

자세한 업무 분담과 일정은 팀 Notion/문서를 참고하세요.
