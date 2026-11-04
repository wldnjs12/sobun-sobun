# 팀원 온보딩 — 처음 시작할 때 이 문서만 보면 됩니다

## 0. 무엇을 만드나

같은 건물 이웃끼리 화장지·세제 같은 생필품과 생수·라면 같은 밀봉 가공식품을 묶음으로 사서 미개봉 단위로 나누는 공동구매 앱입니다. 식재료는 다루지 않아요. 먼저 [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md)의 1~5장을 훑어보세요.

## 1. 저장소 받기 (한 번만)

```bash
git clone https://github.com/wldnjs12/sobun-sobun.git
cd sobun-sobun
git checkout develop
```

## 2. 개발 환경 세팅 (한 번만)

자세한 단계별 설치(PostgreSQL, 실행 방법, 자주 나는 에러)는 [docs/SETUP.md](./docs/SETUP.md)를 그대로 따라 하시면 됩니다. 백엔드 작업하실 분은 IntelliJ에서 **저장소 최상위가 아니라 `backend` 폴더**를 열어야 해요.

외부 API 키(영수증 인식, 주소 검색, 좌표 변환)가 필요하면 [docs/API_KEYS.md](./docs/API_KEYS.md) 참고 — 없어도 화면/로직 개발은 진행 가능합니다.

## 3. Claude Code 쓰신다면

이 폴더에서 `claude` 실행하면 [CLAUDE.md](./CLAUDE.md)가 자동으로 읽혀서 프로젝트 규칙을 이미 알고 있는 상태로 시작해요. `/commit`, `/pr` 커맨드도 바로 쓸 수 있습니다. 처음 열 때 "이 프로젝트 설정을 신뢰하시겠습니까" 확인이 한 번 뜨면 승인해주세요.

## 4. 내 작업 브랜치 만들기 (작업할 때마다)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/내가-할-작업     # 예: feature/pod-search
```

작업 끝나면 커밋하고(`/commit` 또는 직접 `git commit`), `git push origin feature/내가-할-작업` 후 GitHub에서 **develop으로** PR을 올려주세요. (`/pr` 명령어 쓰면 push+PR 생성까지 한 번에 됩니다.) 자세한 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md).

## 5. main / develop 브랜치는 직접 건드리지 않기로 해요

`main`, `develop`에는 직접 커밋/푸시하지 않고 항상 `feature/기능명` 브랜치에서 작업합니다. 다만 매번 PR 올리고 승인 기다리는 절차는 생략하기로 했어요 — feature 브랜치에서 작업을 어느 정도 쌓은 다음, PR을 올리거나(권장) 바로 develop에 머지해서 push하는 방식으로 편하게 진행하면 됩니다. 자세한 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md) 참고.

⚠️ 다만 이건 **팀 약속이지 시스템으로 강제되는 규칙은 아니에요.** Claude Code를 쓰면 훅이 `main`/`develop` 직접 커밋을 한 번 막아주지만, 이건 Claude Code 안에서만 동작하고 IntelliJ GUI나 터미널 git 명령어는 막지 못합니다. GitHub 저장소 자체의 브랜치 보호 규칙도 (걸면 번거로워질 것 같아서) 설정하지 않기로 했으니, 결국은 "우리끼리 main/develop 직접 안 건드리기로 한 약속"에 의존하는 구조예요. 데모 직전엔 특히 조심해주세요.

## 6. 막히면

팀 채팅방에 바로 질문하거나, Claude Code한테 물어보세요 — `CLAUDE.md`에 이 프로젝트 맥락이 이미 들어있어서 꽤 잘 답해줄 거예요.
