---
description: 현재 feature 브랜치를 push하고 develop으로 PR을 생성합니다
argument-hint: "[PR 제목 (생략 가능)]"
allowed-tools: Bash(git branch:*), Bash(git log:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh --version)
---

현재 feature 브랜치를 develop으로 합치는 PR을 준비해줘.

1. `git branch --show-current`로 브랜치를 확인해. `feature/`로 시작하지 않으면 멈추고 알려줘.
2. `gh --version`으로 GitHub CLI 설치 여부를 확인해. 없으면 "brew install gh (Mac) 또는 https://cli.github.com 설치 후 gh auth login 필요"라고 안내하고 멈춰.
3. `git push -u origin <현재 브랜치>`로 원격에 push해.
4. `gh pr create --base develop --head <현재 브랜치> --title "..." --body "..."`로 PR을 생성해. 제목은 인자($ARGUMENTS)가 있으면 그걸 쓰고, 없으면 최근 커밋 메시지들을 요약해서 만들어. 본문은 `.github/PULL_REQUEST_TEMPLATE.md` 형식에 맞춰 채워.
5. 생성된 PR 링크를 알려줘.
