#!/usr/bin/env bash
# Stop 훅: Claude Code 응답(턴)이 끝나면 macOS 알림을 띄운다.
# 개인 설정용 훅 — settings.local.json에서만 등록한다 (팀 공용 settings.json에는 넣지 않음:
# Windows/Linux 팀원 환경에는 osascript가 없어서 팀 전체에 적용하면 안 됨).

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
PROJECT=$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")

if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"브랜치: ${BRANCH:-unknown}\" with title \"Claude Code 작업 완료\" subtitle \"${PROJECT}\" sound name \"Glass\"" >/dev/null 2>&1
fi

exit 0
