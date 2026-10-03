---
description: 현재 브랜치의 변경사항을 관련 기획/설계 문서와 대조해서 확인합니다 (읽기 전용, 코드 수정 없음)
argument-hint: "[기능 키워드 (예: pod, auth, settlement, product) — 생략 시 변경 파일로 자동 추정]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Read, Glob, Grep
---

지금 이 브랜치에서 만든 변경사항이 기획/설계 문서와 맞는지 확인해줘. **코드는 수정하지 말고 확인만 해.**

1. `git branch --show-current`로 브랜치 확인, `git diff develop...HEAD --stat`과 `git log develop..HEAD --oneline`으로 이번 브랜치에서 무엇이 바뀌었는지 파악해.
2. 어떤 기능인지 정해:
   - 인자($ARGUMENTS)가 있으면 그걸 키워드로 써.
   - 없으면 바뀐 파일 경로로 추정해 (`backend/.../auth` → ①, `backend/.../pod` → ②, `backend/.../settlement` → ③, `backend/.../product` → ④).
3. 아래 문서 중 관련된 것들을 읽어:
   - `docs/features/01-onboarding.md` / `02-pod.md` / `03-settlement.md` / `04-product-search.md` 중 해당하는 것
   - `docs/API_SPEC.md`의 해당 기능 섹션 (엔드포인트, 요청/응답 모양)
   - `docs/ERD.md`의 관련 엔티티
   - 루트 `CLAUDE.md` (패키지 구조, `ApiResponse<T>` 규칙, 브랜치 규칙 등 공통 컨벤션)
4. 실제 코드(변경된 파일들)를 읽고 아래 관점으로 대조해:
   - **API 계약**: 메서드/경로/요청/응답이 API_SPEC.md와 일치하는가
   - **비즈니스 규칙**: 기획 문서에 적힌 계산식·엣지 케이스(동시성, 취소, 마감 조건 등)가 실제로 구현/처리됐는가
   - **데이터 모델**: ERD의 엔티티·관계와 실제 엔티티가 맞는가 (다르면 의도적 확장인지 누락인지 판단)
   - **공통 컨벤션**: 응답이 `ApiResponse<T>`로 감싸지는지, 패키지가 기능별 구조(`controller/service/domain/dto`)를 따르는지
5. 결과를 세 그룹으로 정리해서 보여줘:
   - ✅ 기획과 일치
   - ⚠️ 의도적으로 단순화/다르게 한 부분 (이유를 코드나 커밋 메시지에서 찾아 같이 적어)
   - ❌ 놓쳤거나 재확인이 필요한 부분 (구체적으로 어디가 왜 문제인지)
6. 마지막에 "이 상태로 `/handoff` 또는 `/ship` 진행해도 되는지" 한 줄 판단을 내려줘.
