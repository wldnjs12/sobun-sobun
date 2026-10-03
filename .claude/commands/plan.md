---
description: 작업 내용을 받아서 관련 문서/코드를 먼저 살펴본 뒤 Plan 모드로 구현 계획을 세웁니다
argument-hint: "<하고 싶은 작업 설명 (예: 정산 기능 백엔드 시작해줘)>"
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git branch:*), EnterPlanMode, ExitPlanMode, AskUserQuestion
---

사용자가 요청한 작업($ARGUMENTS)의 구현 계획을 세워줘.

1. `git branch --show-current`로 브랜치 확인. `main`/`develop`이면 계획은 세워도 되지만, 구현 시작 전에 `feature/기능명` 브랜치를 새로 만들어야 한다고 미리 알려줘.
2. 계획 세우기 전에 관련 자료를 먼저 읽어:
   - 작업 키워드로 관련된 `docs/features/01-onboarding.md` / `02-pod.md` / `03-settlement.md` / `04-product-search.md`
   - `docs/API_SPEC.md`의 관련 섹션, `docs/ERD.md`의 관련 엔티티
   - 루트 `CLAUDE.md`의 공통 컨벤션(기능별 패키지 구조 `controller/service/domain/dto`, 응답은 `ApiResponse<T>`)
   - 관련 기존 코드(같은 기능 패키지의 기존 컨트롤러/서비스/엔티티)를 둘러봐서 패턴을 파악해
3. `EnterPlanMode`로 Plan 모드에 들어가.
4. Plan 모드 안에서 조사한 내용을 바탕으로 구체적인 계획을 세워서 제시해: 무엇을 만들지(엔티티/DTO/레포지토리/서비스/컨트롤러 단위로), 기획 문서의 비즈니스 규칙·엣지 케이스를 어떻게 반영할지, 기획에 없어서 임의로 정해야 하는 부분이 있으면 짚어줘.
5. 애매하거나 팀 논의가 필요한 부분(예: 기획 문서에 "팀 논의" 또는 "결정 안 됨"이라고 적힌 항목)이 있으면 계획을 제시하기 전에 `AskUserQuestion`으로 먼저 물어봐.
6. 사용자가 계획을 승인하면 `ExitPlanMode`로 확정하고, 그 다음부터는 승인된 계획대로 구현을 시작해.
