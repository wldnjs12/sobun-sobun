# 핸드오프: 팟(②) 화면 + 최저가(④) 화면 — develop 병합 메모

_최종 갱신: 2026-10-03 · 브랜치: feature/pod-screens_

이 문서는 화면 구현 자체(도우현 작업)를 설명하는 문서가 아니라, **PR #4를 develop에 머지하기 위해 지원이 처리한 병합 작업**만 기록합니다. 화면 구현 내용은 PR #4 설명과 코드를 참고해주세요.

## 이번에 한 작업

- `develop`(①qr-auth, ③settlement, ②pod-realtime 머지 후 최신 상태)을 `feature/pod-screens`에 병합
- `frontend/package-lock.json`에서 add/add 충돌 발생 (이 브랜치와 `feature/qr-auth`가 각자 `npm install`을 따로 돌려서 lockfile이 달라짐) → 삭제 후 `npm install`로 재생성해서 해결. `package.json`(의존성 목록)은 양쪽이 동일해서 실제 의존성 변경은 없음.
- `npm run build`로 정상 빌드되는 것까지 확인 후 머지 커밋 push

## 확인한 것

- `frontend/src/features/pod/podApi.js`가 `docs/handoff/pod.md`에 정리된 팟 API 계약(`buildingId`/`userId`/`hostUserId` 쿼리 파라미터, `GET /pods?buildingId=` 등)과 정확히 일치하는 것을 코드로 직접 확인함 — 백엔드·프론트 통합에 문제없을 것으로 보임.
- `frontend/src/features/products/ProductListPage.jsx`는 `GET /products/search?keyword=`를 호출하는데, **이 백엔드(④, 김민준 담당)는 아직 스텁 상태**(`ProductSearchService`가 `UnsupportedOperationException`)라 지금 머지해도 최저가 검색은 500 에러가 납니다. 백엔드 구현 전까지 알려진 한계로 남겨둡니다.

## 다음 작업자 안내

- 화면 관련 질문은 도우현님께 — 이 문서는 병합 처리 기록용입니다.
- ④ 최저가 백엔드가 완성되면 `ProductListPage.jsx`가 바로 동작할 것으로 보임 (프론트는 이미 준비됨).
