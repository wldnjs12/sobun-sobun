# 핸드오프: 프론트엔드 (② 팟 · ④ 최저가 화면)

_최종 갱신: 2026-10-03 · 브랜치: feature/pod-screens · PR: [#4](https://github.com/wldnjs12/sobun-sobun/pull/4) · 담당: 도우현_

## 이번 작업 요약

- Stitch 디자인(`stitch_new_starter_project/`) 기준으로 팟 화면 전체와 최저가 화면 구현
  - 05/16 건물 홈(목록·빈 상태) `/home` · 06 팟 생성 `/pods/new` · 07 팟 상세 `/pods/:id` · 08 참여 확인(바텀시트) · 09 모집 완료 `/pods/:id/complete`
  - 14 최저가 조회 `/products` — 결과에서 "이 상품으로 팟 만들기" 누르면 생성 화면에 상품명·가격 자동 입력
- 임시 데이터 대신 ② 팟 백엔드 API 연동, 팟장 **모집 마감** 버튼 추가
- 디자인 토큰(`src/styles/tokens.css`), 공통 컴포넌트(`src/components/` 헤더·하단 탭·아이콘) 추가
- **버그 수정**: `socket.js`가 `ws://…/ws-sobun`으로 붙어서 실시간 갱신이 연결조차 안 되고 있었음 → 백엔드가 SockJS 엔드포인트(`.withSockJS()`)라 `/ws-sobun/websocket`으로 수정

## 기획 대비 확인 (spec-check)

**일치**
- 1인당 금액 = 총액 × (1 + 수고비율) ÷ 인원, 원 단위 올림 — `podUtils.js`가 백엔드와 같은 식
- 마감은 목표 인원 도달 후 팟장 수동 마감만, `deadline`은 표시용(지나도 "기한 지남" 문구만)
- 참여 취소는 마감 전까지만 가능 → 참여 확인 시트에 동의 문구로 안내
- 최저가: 가격 오름차순, 결과 없음/에러 안내, API가 실패해도 팟 생성으로 갈 수 있음

**의도적으로 단순화/변경**
- Stitch 디자인 중 기획에 없는 기능(에스크로 결제, 모집 실패 자동 환불, 팟 채팅방, 입고요청 투표, 가짜 누적 통계 배너)은 사용자에게 틀린 약속이 돼서 넣지 않음
- 서버가 팟을 참여자 0명으로 만들어서, 프론트가 생성 직후 팟장을 참여시킴 (`podApi.createPod`)
- 사진·원가·카테고리·참여자 목록은 API에 없어 기본 아이콘/숨김 처리 (`podApi.toPod`의 기본값)

**재확인 필요**
- 수고비율을 팟장이 고를 수 있게 할지(02-pod.md "팀 논의") — 지금은 0/3/5/8% 선택지

## API 표면 (프론트가 호출하는 것)

| 화면 | 호출 |
| --- | --- |
| 건물 홈 | `GET /pods?buildingId=` |
| 팟 상세·모집 완료 | `GET /pods/{id}`, WS `/ws-sobun/websocket` 구독 `/topic/pods/{id}` |
| 참여 | `POST /pods/{id}/join?userId=` |
| 마감 | `POST /pods/{id}/close?hostUserId=` |
| 생성 | `POST /pods` → 이어서 `POST /pods/{id}/join` (팟장) |
| 최저가 | `GET /products/search?keyword=` |

## 알려진 제한사항 / TODO

- **로그인(세션) 없음** → 주소에 `?user=2`를 붙여 열면 그 탭은 2번 사용자 (`currentUser.js`, 탭마다 sessionStorage). 세션이 생기면 이 파일을 지우고 서버 값으로 교체
- "내가 참여했는지" 조회 API 없음 → 이 브라우저에서 참여한 팟을 localStorage에 기억
- `ProductSearchService`(④ 백엔드)가 아직 TODO → 지금은 최저가 화면에 "잠시 후 다시 시도해주세요"가 나옴. 응답 형식(`name, price, mallName, url`)에 맞춰둬서 구현되면 바로 동작
- 데모 DB에 `building` id=1이 있어야 팟 생성 가능

## 다음 작업자 안내

- 실행: 백엔드(`./gradlew bootRun`) + `cd frontend && npm install && npm run dev` → `http://localhost:5173/home`
- 실시간 확인: 탭 두 개를 `/home`, `/home?user=2`로 열고 한쪽에서 참여 → 다른 쪽 금액이 바로 내려감
- 다음 할 일: ① 온보딩 / ③ 정산 화면 (`feature/onboarding-settlement-ui`에서 진행 중)
