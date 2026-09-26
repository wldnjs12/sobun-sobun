---
description: 브랜치를 확인하고 팀 컨벤션에 맞춰 커밋합니다
argument-hint: "[커밋 메시지 (생략 가능)]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*)
---

지금 변경사항을 우리 팀 컨벤션(CONTRIBUTING.md)에 맞춰 커밋해줘.

1. `git branch --show-current`로 현재 브랜치를 확인해. `main`이나 `develop`이면 커밋하지 말고 "feature/기능명 브랜치를 새로 만들어서 작업해주세요"라고 알려주고 멈춰.
2. `git status`, `git diff`로 변경 내용을 파악해.
3. 커밋 메시지는 `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:` 중 하나로 시작하는 한 줄 요약으로 작성해. 인자로 메시지가 주어졌으면($ARGUMENTS) 그걸 우선 쓰고, 없으면 변경 내용을 보고 알맞은 걸 제안해서 보여줘.
4. `git add -A`와 `git commit -m "..."`을 실행해.
5. 커밋 결과(해시, 메시지)를 짧게 알려줘.
