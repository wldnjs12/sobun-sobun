---
description: 기획 대조(spec-check) → 코드 커밋(commit) → 핸드오프 문서(handoff)까지 한 번에 마무리합니다
argument-hint: "[기능 키워드 (예: pod, auth, settlement, product) — 생략 시 변경 파일로 자동 추정]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Read, Write, Edit, Glob, Grep
---

지금까지 이 브랜치에서 한 (auto 모드) 작업을 마무리해줘. 순서대로, 각 단계에서 문제가 나오면 다음 단계로 넘어가지 말고 멈춰서 알려줘.

1. **브랜치 확인**: `git branch --show-current`. `main`/`develop`이면 멈추고 feature 브랜치 생성을 안내해.
2. **기획 대조** (`/spec-check`와 동일한 절차): 이번 브랜치의 변경사항을 관련 `docs/features/*.md`, `docs/API_SPEC.md`, `docs/ERD.md`, 루트 `CLAUDE.md` 공통 컨벤션과 대조해서 ✅/⚠️/❌로 정리해서 보여줘.
   - ❌(놓친 것)가 있으면 여기서 멈추고 사용자에게 먼저 고칠지, 알고 넘어갈지 물어봐.
3. **코드 커밋** (`/commit`과 동일한 절차): `git status`/`git diff`로 미커밋 변경을 확인하고, `feat:`/`fix:`/`style:`/`refactor:`/`docs:`/`chore:` 중 알맞은 접두사로 커밋 메시지를 만들어 커밋해. 이미 전부 커밋되어 있으면 이 단계는 건너뛰어.
4. **핸드오프 문서** (`/handoff`와 동일한 절차): `docs/handoff/<슬러그>.md`를 2번 결과를 반영해서 작성/갱신하고 `docs: ... 핸드오프 문서 갱신` 커밋으로 남겨.
5. 마지막에 요약해줘: 이번에 커밋된 내용, 핸드오프 문서 경로, 그리고 push해서 PR 올릴 준비가 됐으면 `/pr`을 쓰라고 안내해.
