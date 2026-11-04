# 진행 현황 (2026-11-04)

통합 브랜치 `feature/household-replan` 기준. 아래 기능 브랜치는 전부 여기에 머지했고, 백엔드 테스트(JDK 17)와 프론트 빌드는 통과했어요. 아직 push하지 않았어요.

- [완료] `feature/replan-docs`: PRODUCT_SPEC 신규 작성, 보완계획서(10/03) 기준으로 문서 개편, 필요 없는 문서 11개 삭제
- [완료] `feature/account-login`: 회원가입·로그인(토큰), 서버가 토큰으로 사용자 확정, 계정 id는 100000부터 발급
- [완료] `feature/address-search`: 건물명 없는 주택 등록, 페이지 넘김, 지번 주소 표시, 상세주소(본인만), 주소 API 장애 시 데모 목록(`ADDRESS_DEMO_FALLBACK`)
- [완료] `feature/household-pod`: 카테고리(생수·가공식품 포함), 미개봉 단위 나눔, 검색·필터, 수정·모집 취소, 내 팟, 데모 시드(`DEMO_SEED`)
- [완료] `feature/community-settlement`: 건물 단위 격리 유지, 정산은 대표·참여자만, 송금 링크 https만, GPS 실패 안내
- [완료] 통합: 실시간(STOMP) 구독을 토큰으로 검증, 팟 수정 라우트 연결, 반경 1km 코드 제거, 옛 팟 데이터 호환 확인
- [완료] Playwright QA(로컬): API 접근 제어 + 핵심 흐름(개설→참여→마감→정산→송금→픽업). 결과는 `docs/FEEDBACK.md`(8건: 중간 2, 낮음 6)
- [완료] F-1(정산 확정 후 모집 완료 화면 막힘)·F-3("대표이" 조사) 수정 후 재테스트 통과
- [미완료] F-2 커뮤니티 GPS 서버 강제 여부 결정, 낮음 항목(F-4~F-8), 커뮤니티 UI·수정/취소 UI QA
- [미완료] 배포·실서버 검증

## 다음 할 일
1. F-2 결정(커뮤니티 글쓰기에 GPS 서버 강제할지) → 필요하면 낮음 항목 정리, 미검증 범위(커뮤니티 UI 등) QA
2. `/handoff` 실행: push 훅이 `docs/handoff/` 변경을 요구해요.
3. `feature/household-replan` push → develop PR → main 반영: 이 단계는 사용자 결정이 필요해요(직접 머지할지, PR만 올릴지, Railway·Vercel 배포 브랜치 확인).
4. 실서버 검증. 선택 환경변수: `LOCATION_CHECK_DEMO_MODE`, `ADDRESS_DEMO_FALLBACK`, `DEMO_SEED`
