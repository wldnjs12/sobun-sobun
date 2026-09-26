# 팀원 온보딩 — 처음 시작할 때 이 문서만 보면 됩니다

## 1. 저장소 받기 (한 번만)

```bash
git clone https://github.com/wldnjs12/sobun-sobun.git
cd sobun-sobun
git checkout develop
```

## 2. 개발 환경 세팅 (한 번만)

자세한 단계별 설치(PostgreSQL, 실행 방법, 자주 나는 에러)는 [docs/SETUP.md](./docs/SETUP.md)를 그대로 따라 하시면 됩니다. 백엔드 작업하실 분은 IntelliJ에서 **저장소 최상위가 아니라 `backend` 폴더**를 열어야 해요.

외부 API 키(영수증 인식, 최저가 조회)가 필요하면 [docs/API_KEYS.md](./docs/API_KEYS.md) 참고 — 없어도 화면/로직 개발은 진행 가능합니다.

## 3. Claude Code 쓰신다면

이 폴더에서 `claude` 실행하면 [CLAUDE.md](./CLAUDE.md)가 자동으로 읽혀서 프로젝트 규칙을 이미 알고 있는 상태로 시작해요. `/commit`, `/pr` 커맨드도 바로 쓸 수 있습니다. 처음 열 때 "이 프로젝트 설정을 신뢰하시겠습니까" 확인이 한 번 뜨면 승인해주세요.

## 4. 내 작업 브랜치 만들기 (작업할 때마다)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/내가-할-작업     # 예: feature/qr-auth
```

작업 끝나면 커밋하고(`/commit` 또는 직접 `git commit`), `git push origin feature/내가-할-작업` 후 GitHub에서 **develop으로** PR을 올려주세요. (`/pr` 명령어 쓰면 push+PR 생성까지 한 번에 됩니다.) 자세한 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md).

## 5. 담당 업무 및 목표 일정

| 담당자 | 맡은 기능 | 참고 문서 | 1차 목표 (9/29까지) | 2차 목표 (10/1까지) |
| --- | --- | --- | --- | --- |
| 문소원 | ①온보딩(백) · ③정산(백) | [01-onboarding](./docs/features/01-onboarding.md), [03-settlement](./docs/features/03-settlement.md) | QR+GPS 인증 API 완성 | 영수증 OCR + 정산 계산 API |
| 김민준 | ①온보딩(프론트) · ④최저가(백) | [01-onboarding](./docs/features/01-onboarding.md), [04-product-search](./docs/features/04-product-search.md) | QR 스캔+위치 확인 화면 | 최저가 조회 API 연동 |
| 도우현 | ②팟(프론트) · ④최저가(프론트) | [02-pod](./docs/features/02-pod.md), [04-product-search](./docs/features/04-product-search.md) | 팟 목록/상세 정적 화면 | 실시간 갱신 연동 + 최저가 화면 |
| 홍수진 | 디자인 시스템 전체 · ③정산(프론트) | [DESIGN_HANDOFF](./docs/DESIGN_HANDOFF.md) | 전체 화면 시안 완료(9/27까지가 이상적) | 정산/영수증 업로드 화면 개발 |
| 최지원 (PM) | ②팟(백, 리드) · 코드 리뷰 총괄 | [02-pod](./docs/features/02-pod.md) | 실시간 WebSocket 정산 API | 전체 통합 지원, PR 리뷰 |

- 9/30~10/1: 기능별 프론트-백엔드 연동
- 10/2: 통합 테스트 + [데모 시나리오](./docs/DEMO_SCRIPT.md) 리허설
- 10/3(토): 빌드업데이 — 온보딩→팟→실시간 갱신→정산까지 이어지는 데모 완성이 목표

## 6. main / develop 브랜치는 직접 건드리지 않기로 해요

`main`, `develop`에는 직접 커밋/푸시하지 않고 항상 `feature/기능명` 브랜치에서 작업합니다. 다만 매번 PR 올리고 승인 기다리는 절차는 생략하기로 했어요 — feature 브랜치에서 작업을 어느 정도 쌓은 다음, PR을 올리거나(권장) 바로 develop에 머지해서 push하는 방식으로 편하게 진행하면 됩니다. 자세한 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md) 참고.

⚠️ 다만 이건 **팀 약속이지 시스템으로 강제되는 규칙은 아니에요.** Claude Code를 쓰면 훅이 `main`/`develop` 직접 커밋을 한 번 막아주지만, 이건 Claude Code 안에서만 동작하고 IntelliJ GUI나 터미널 git 명령어는 막지 못합니다. GitHub 저장소 자체의 브랜치 보호 규칙도 (걸면 번거로워질 것 같아서) 설정하지 않기로 했으니, 결국은 "우리끼리 main/develop 직접 안 건드리기로 한 약속"에 의존하는 구조예요. 데모 직전(10/2~10/3)엔 특히 조심해주세요.

## 7. 할 일 관리 — GitHub Projects 칸반 보드

팀 할 일은 GitHub Projects 칸반 보드로 관리합니다: https://github.com/users/wldnjs12/projects/1 (Backlog → 진행중 → 리뷰 → 완료). 이슈를 만들고 담당자를 지정하면 보드에서 진행 상황을 한눈에 볼 수 있어요. 사용법은 [docs/PROJECT_BOARD.md](./docs/PROJECT_BOARD.md) 참고.

## 8. 막히면

팀 채팅방에 바로 질문하거나, Claude Code한테 물어보세요 — `CLAUDE.md`에 이 프로젝트 맥락이 이미 들어있어서 꽤 잘 답해줄 거예요.
