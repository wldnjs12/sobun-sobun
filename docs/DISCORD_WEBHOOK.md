# Discord로 GitHub 알림(push/PR/이슈) 받기

팀 Discord 채널에 GitHub 저장소 활동(푸시, PR, 이슈 등)이 자동으로 올라오게 하는 방법입니다. Discord 웹훅(Webhook)을 만들어서 GitHub 저장소에 등록하면 끝나요. **웹훅 URL은 비밀번호나 다름없는 값이라, 이 문서만 보고 지원님(또는 웹훅 만드는 사람)이 직접 진행해주셔야 합니다.**

## 1. Discord에서 웹훅 만들기

1. 알림 받을 채널(예: `#github-알림` 또는 기존 팀 채널)에서 **채널 편집**(채널 이름 옆 톱니바퀴, 또는 채널 우클릭 → 채널 편집)
2. 왼쪽 메뉴에서 **연동(Integrations)** 클릭
3. **웹후크(Webhooks)** → **새 웹후크 만들기(New Webhook)**
4. 이름을 알아보기 쉽게 바꿔주세요 (예: `GitHub 알림봇`), 원하면 아이콘도 GitHub 로고로 변경 가능
5. **웹후크 URL 복사(Copy Webhook URL)** 클릭 → 이 URL을 어딘가에 잠깐 메모해둡니다 (다음 단계에서 씁니다)

> ⚠️ 이 URL을 아는 사람은 누구나 그 채널에 메시지를 보낼 수 있어요. 팀 채팅방이나 공개된 곳에 붙여넣지 말고, 절대 GitHub 저장소 코드나 커밋 메시지에 남기지 마세요.

## 2. URL 끝에 `/github` 붙이기

복사한 URL은 이런 모양일 거예요:

```
https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz
```

맨 뒤에 `/github`를 붙여주세요:

```
https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz/github
```

이렇게 하면 Discord가 GitHub이 보내는 알림 형식을 예쁘게(커밋 목록, PR 제목 등) 자동으로 정리해서 보여줍니다. `/github`를 안 붙이면 알림이 오긴 하지만 그냥 날 것(raw JSON)의 못생긴 텍스트로 옵니다.

## 3. GitHub 저장소에 웹훅 등록하기

1. https://github.com/wldnjs12/sobun-sobun/settings/hooks 접속 (저장소 → Settings → Webhooks)
2. **Add webhook** 클릭
3. 아래처럼 입력:
   - **Payload URL**: 2번에서 만든 `.../github` 붙인 URL 붙여넣기
   - **Content type**: `application/json`
   - **Which events would you like to trigger this webhook?**
     - 간단하게 하려면 **Just the push event** 선택 (커밋 푸시할 때마다만 알림)
     - 이슈/PR 알림도 받고 싶으면 **Let me select individual events** 선택 후 `Pushes`, `Pull requests`, `Issues` 체크
     - 전부 다 받고 싶으면 **Send me everything**
4. **Active** 체크되어 있는지 확인
5. **Add webhook** 클릭

## 4. 테스트

아무 브랜치에나 커밋 하나 push 해보세요. 몇 초 안에 Discord 채널에 GitHub 봇 이름으로 알림이 올라오면 성공입니다. 안 올라오면 GitHub 저장소의 Settings → Webhooks → 방금 만든 웹훅 클릭 → 하단 **Recent Deliveries**에서 실패 사유(빨간 X)를 확인할 수 있어요. 대부분 URL 뒤 `/github`를 빠뜨렸거나 Payload URL을 잘못 붙여넣은 경우입니다.

## 5. (선택) 특정 브랜치만 알림 오게 하고 싶다면

`push` 이벤트는 기본적으로 모든 브랜치의 푸시에 반응합니다. `feature/*` 브랜치 푸시가 너무 자주 알림 와서 시끄러우면, 웹훅 자체에는 브랜치 필터가 없어서 대신 Discord 채널 알림 설정(채널 알림 끄고 특정 시간에만 확인)으로 조절하거나, GitHub Actions 같은 걸로 더 세밀하게 필터링할 수 있습니다 — 지금 단계에서는 굳이 필요 없을 것 같아서 생략했어요.
