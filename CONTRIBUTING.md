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
