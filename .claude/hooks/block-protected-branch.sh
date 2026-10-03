#!/usr/bin/env bash
# PreToolUse 훅: main/develop 브랜치에서 직접 commit·push 하는 것을 막는다.
# jq 등 추가 설치 없이 팀원 전원 환경에서 그대로 동작하도록 grep만 사용.

INPUT="$(cat)"
COMMAND=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"')

case "$COMMAND" in
  *"git commit"*|*"git push"*)
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "develop" ]; then
      echo "🚫 '$BRANCH' 브랜치엔 직접 commit/push 할 수 없어요. feature/기능명 브랜치를 새로 만들어서 작업해주세요. (CONTRIBUTING.md 참고)" >&2
      exit 2
    fi
    ;;
esac

exit 0
