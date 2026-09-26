# 프로젝트 안내 (Claude Code용)

이 파일은 이 저장소에서 Claude Code를 여는 모든 팀원에게 자동으로 읽힙니다. 코드 작업을 도와줄 때 아래 규칙을 지켜주세요.

## 프로젝트

"소분소분" — 같은 건물 이웃끼리 QR+GPS 인증 후 대용량 식재료를 공동구매하는 앱. MOONG TechThon 2026 해커톤 제출작(팀명: 뿌리).

## 기술 스택

- 백엔드: `backend/` — Spring Boot 3, Java 17, Gradle, Spring Data JPA, WebSocket(STOMP), PostgreSQL
- 프론트엔드: `frontend/` — React + Vite, react-router-dom, @stomp/stompjs
- 사업계획서에는 Node.js/Express로 적혀 있지만 실제 구현은 Spring Boot로 통일했습니다. Node.js 관련 코드나 라이브러리를 제안하지 마세요.

## 패키지/폴더 구조 규칙

백엔드는 계층형이 아니라 **기능별 패키지**로 나뉩니다: `auth`(온보딩/인증), `pod`(팟·실시간 정산), `settlement`(수고비 정산), `product`(최저가 조회), `global`(공통 설정). 새 코드는 해당 기능 패키지 안에 `controller/service/domain/dto`로 넣어주세요.

프론트엔드는 `src/features/<기능명>/` 아래에 화면 컴포넌트를 두고, 공통 API 호출은 `src/api/client.js`(REST)와 `src/api/socket.js`(WebSocket)를 사용합니다.

모든 백엔드 API 응답은 `ApiResponse<T>`(`{ success, data, message }`)로 감싸 반환합니다. 새 컨트롤러도 이 형식을 따라주세요.

## 커밋/브랜치 규칙

자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md) 참고. 요약:

- `main`, `develop`에는 직접 커밋/푸시하지 않습니다 (훅으로 차단됨). 항상 `feature/기능명` 브랜치에서 작업.
- 커밋 메시지는 `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:` 중 하나로 시작.
- 커밋할 땐 `/commit`, PR 올릴 땐 `/pr` 커스텀 명령어를 사용해주세요.

## 팀원 안내

이 팀은 컴퓨터공학과 5명으로 구성되어 있고, 그중 2명(김민준, 도우현)은 실무 경험이 없는 초보자입니다. 이들의 코드를 리뷰하거나 설명할 때는:

- 왜 이렇게 동작하는지 원리를 같이 설명해주세요 (정답만 던지지 말 것).
- 한 번에 너무 많은 개념을 몰아서 설명하지 마세요.
- 에러 메시지를 그대로 읽어주고 어디서 발생했는지 짚어주세요.
