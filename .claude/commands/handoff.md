---
description: 이번 세션 작업 내용을 docs/handoff/ 문서로 정리하고 커밋합니다
argument-hint: "[기능 키워드 (예: pod, auth, settlement, product) — 생략 시 변경 파일로 자동 추정]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Read, Write, Edit, Glob
---

지금까지 이 브랜치에서 한 작업을 `docs/handoff/` 문서로 남기고 커밋해줘.

1. `git branch --show-current`로 브랜치 확인. `main`이나 `develop`이면 멈추고 "feature/기능명 브랜치에서 작업해주세요"라고 알려줘.
2. 어떤 기능인지 정해 (인자($ARGUMENTS) 우선, 없으면 변경 파일 경로로 추정 — `/spec-check`와 동일한 매핑). 슬러그를 정해(`pod`, `auth`, `settlement`, `product` 등).
3. `git log develop..HEAD --oneline`, `git diff develop...HEAD --stat`로 이번 브랜치의 전체 변경 내역을 파악해. 이미 `/spec-check`를 돌렸다면 그 결과를 재사용하고, 아니었다면 간단히 다시 대조해봐 (`docs/features/`, `docs/API_SPEC.md`, `docs/ERD.md` 기준).
4. `docs/handoff/README.md`의 템플릿 형식으로 `docs/handoff/<슬러그>.md`를 작성해. **이미 파일이 있으면 새로 만들지 말고 내용을 최신 상태로 갱신**해 (최종 갱신 날짜/브랜치도 갱신):
   - 이번 작업 요약
   - 기획 대비 확인 결과 (일치 / 의도적 단순화(이유) / 미확인)
   - API 표면 (구현된 엔드포인트 목록)
   - 알려진 제한사항 / TODO (코드의 TODO 주석도 훑어서 반영)
   - 다음 작업자 안내 (로컬 실행/테스트 방법, 다음에 할 일)
5. `git status`로 다른 미커밋 코드 변경이 남아있는지 확인해. 남아있으면 먼저 알려주고 "코드 변경은 `/commit`으로 먼저 커밋하는 걸 권장해"라고 안내한 뒤, 그래도 계속하라고 하면 문서만 커밋해.
6. `git add docs/handoff/<슬러그>.md`, `git commit -m "docs: <기능> 핸드오프 문서 갱신"`으로 커밋해 (문서만 따로 커밋 — 코드 커밋과 섞지 않기).
7. 커밋 결과와 문서 경로를 짧게 알려주고, push까지 하려면 `/pr`을 쓰라고 안내해.
