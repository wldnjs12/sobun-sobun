# 협업 가이드 (초보자도 5분이면 읽는 버전)

## 브랜치 전략

- `main` : 배포/데모용. 직접 커밋 금지.
- `develop` : 팀 통합 브랜치. 모든 기능 브랜치는 여기서 갈라지고 여기로 합쳐진다.
- `feature/기능명` : 실제 작업 브랜치. 예) `feature/qr-auth`, `feature/pod-realtime`, `feature/settlement-ocr`, `feature/product-search`

### 작업 순서 (매번 동일)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/내가-할-작업

# ...작업...

git add .
git commit -m "feat: QR 스캔 후 위치 검증 API 연동"
git push origin feature/내가-할-작업
# 이후 GitHub에서 develop으로 Pull Request 생성
```

## 커밋 메시지 컨벤션 (간단 버전)

```
feat: 새 기능 추가
fix: 버그 수정
style: 화면 스타일만 변경 (로직 변경 없음)
refactor: 기능 변화 없는 코드 정리
docs: 문서만 변경
chore: 설정/빌드 관련 변경
```

예시: `feat: 팟 참여 시 1인당 금액 실시간 재계산`

## PR(Pull Request) 규칙

1. `feature/*` -> `develop` 으로만 PR을 올린다 (`main`으로 직접 올리지 않는다).
2. 팀원 1명 이상의 승인(Approve) 후 머지한다.
3. PR 제목은 커밋 컨벤션과 동일한 형식으로 작성한다.
4. 막히면 부끄러워하지 말고 팀 채팅에 바로 질문하기 — 특히 초보 팀원은 작게 자주 PR을 올리는 게 배우기에 더 좋다.

## 코드 리뷰 원칙

- 초보 팀원의 PR은 지원/문소원이 우선적으로 리뷰한다.
- "왜 이렇게 했는지" 물어보는 것도 좋은 리뷰다. 정답을 알려주기보다 같이 찾아가는 방식으로.

## Claude Code 자동화 (팀 공통)

이 저장소엔 `.claude/` 설정이 커밋되어 있어서, `git clone` 후 로컬 Claude Code로 이 폴더를 열면 아래가 팀원 전체에게 동일하게 적용됩니다.

- `/commit` — 지금 브랜치와 변경사항을 확인하고 위 컨벤션에 맞는 커밋 메시지로 커밋
- `/pr` — 현재 feature 브랜치를 push하고 develop으로 PR 생성
- **안전장치**: `main`이나 `develop` 브랜치에서 직접 `git commit`/`git push`를 실행하면 훅이 자동으로 막습니다. "브랜치 확인 깜빡함" 실수를 방지하기 위한 것이니, 막히면 `feature/기능명` 브랜치를 새로 만들어서 다시 시도하세요.

처음 이 폴더를 Claude Code로 열면 프로젝트 설정을 신뢰할지 한 번 물어봅니다 — 팀이 커밋한 설정이니 승인하면 됩니다.

Windows에서 작업하는 팀원은 Git Bash가 설치되어 있어야 훅 스크립트(`.claude/hooks/*.sh`)가 정상 동작합니다 (Git for Windows를 설치했다면 기본 포함되어 있어요).
