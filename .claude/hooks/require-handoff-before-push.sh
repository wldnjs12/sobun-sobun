#!/usr/bin/env bash
# PreToolUse 훅: feature 브랜치에서 git push 하기 전에 핸드오프 문서가
# 이번 브랜치 작업에 포함됐는지 확인한다.
# (코드 변경 커밋은 있는데 docs/handoff/*.md 갱신 커밋이 없으면 push를 막는다)
# jq 없이 팀원 전원 환경에서 동작하도록 grep만 사용 (block-protected-branch.sh와 동일한 방식).

INPUT="$(cat)"
COMMAND=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"')

case "$COMMAND" in
  *"git push"*)
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

    case "$BRANCH" in
      feature/*) ;;
      *) exit 0 ;;  # feature 브랜치가 아니면 이 훅은 관여하지 않음
    esac

    # develop에서 갈라진 뒤 이 브랜치에 커밋된 변경 파일 목록 (원격 develop 우선, 없으면 로컬 develop)
    CHANGED=$(git diff --name-only origin/develop...HEAD 2>/dev/null)
    if [ -z "$CHANGED" ]; then
      CHANGED=$(git diff --name-only develop...HEAD 2>/dev/null)
    fi

    if [ -z "$CHANGED" ]; then
      exit 0  # 아직 develop 대비 커밋된 변경이 없으면(계획 단계) 통과
    fi

    if ! printf '%s\n' "$CHANGED" | grep -q '^docs/handoff/'; then
      echo "🚫 push 전에 핸드오프 문서를 먼저 남겨주세요. Claude Code에서 /handoff 를 실행하면 docs/handoff/에 작성·커밋됩니다. (급하면 팀 채팅에 알리고 넘어가도 되지만, 가능하면 남기고 push해주세요)" >&2
      exit 2
    fi
    ;;
esac

exit 0
