# 배포 가이드 (Supabase + Railway + Vercel)

로컬 개발 환경 설정은 [SETUP.md](./SETUP.md) 참고. 이 문서는 데모/제출용으로 외부에서 접속 가능한 URL을 만드는 방법이다.

## 왜 이렇게 나뉘나

- **프론트(React/Vite)** → **Vercel**: 정적 빌드 결과를 올리는 데 최적화돼 있다.
- **DB(PostgreSQL)** → **Supabase**: 매니지드 Postgres를 바로 내준다.
- **백엔드(Spring Boot API + WebSocket)** → **Railway**: 상시 떠 있는 JVM 프로세스가 필요하고, `/ws-sobun`이 지속 연결(STOMP WebSocket)을 쓰기 때문에 **Vercel에는 올릴 수 없다**(Vercel은 서버리스 함수/정적 사이트만 지원). 이 세 서비스는 서로 다른 도메인에 뜨므로 CORS·WebSocket 허용 Origin 설정이 필요하다 (아래 5번).

한 번 배포한 뒤에도 계속 코드를 수정해도 된다 — GitHub에 푸시하면 Railway/Vercel이 각자 자동으로 다시 빌드·배포한다(아래 6번).

## 1. Supabase — DB 준비

1. https://supabase.com 에서 새 프로젝트 생성 (DB 비밀번호를 설정하게 되는데 꼭 기억해둘 것).
2. 프로젝트 대시보드 → **Settings → Database → Connection string** 에서 연결 정보 확인.
   - **Host**, **Port**(기본 5432, 직접 연결), **Database name**(`postgres`), **User**, **Password**를 메모한다.
   - Supabase Postgres는 SSL 연결이 필요하다 — JDBC URL 끝에 `?sslmode=require`를 붙인다.
3. 아래 형태로 JDBC URL을 만든다 (Railway 환경변수에 그대로 쓸 값):
   ```
   jdbc:postgresql://<Supabase Host>:5432/postgres?sslmode=require
   ```
4. 테이블은 따로 만들 필요 없다 — 백엔드가 `ddl-auto: update`라서 처음 뜰 때 자동으로 만든다.

## 2. Railway — 백엔드 배포

1. https://railway.app 에서 New Project → **Deploy from GitHub repo** → 이 저장소 선택.
2. 서비스 설정에서 **Root Directory를 `backend`로 지정** — `backend/Dockerfile`을 자동으로 찾아 빌드한다 (멀티 스테이지: JDK 17로 빌드, JRE 17로 실행).
3. **Variables** 탭에서 환경변수 설정:
   | 변수 | 값 | 비고 |
   | --- | --- | --- |
   | `SPRING_DATASOURCE_URL` | 1번에서 만든 Supabase JDBC URL | |
   | `SPRING_DATASOURCE_USERNAME` | Supabase DB User | |
   | `SPRING_DATASOURCE_PASSWORD` | Supabase DB Password | |
   | `ALLOWED_ORIGINS` | 일단 `http://localhost:5173`로 두고, 3번에서 Vercel URL이 나오면 그 값으로 교체 | CORS·WebSocket 허용 Origin |
   | `JUSO_API_KEY` / `KAKAO_REST_API_KEY` | (선택) 발급받았으면 입력 | 없으면 Stub 구현체가 데모 응답을 돌려준다 — [API_KEYS.md](./API_KEYS.md) |
   | `NAVER_OCR_INVOKE_URL` / `NAVER_OCR_SECRET_KEY` | (선택) | 영수증 OCR, 없으면 Stub |
   | `LOCATION_CHECK_DEMO_MODE` | (선택) `true`면 GPS 2차 확인이 항상 통과(고정 데모 좌표) | 데모 리허설용, 기본 꺼짐 |

   `PORT`는 Railway가 자동으로 주입하므로 직접 설정하지 않는다 (`application.yml`의 `server.port: ${PORT:8080}`이 받는다).
4. 배포가 끝나면 **Settings → Networking → Generate Domain**으로 퍼블릭 URL을 받는다 (예: `https://sobunsobun-backend.up.railway.app`). 이 주소를 메모해둔다 — 3번 Vercel 설정에 쓴다.

## 3. Vercel — 프론트 배포

1. https://vercel.com 에서 New Project → 이 저장소 Import.
2. **Root Directory를 `frontend`로 지정**. Framework Preset은 Vite로 자동 인식된다 (Build Command `npm run build`, Output Directory `dist`).
3. **Environment Variables**에 2번에서 받은 Railway 주소를 넣는다:
   | 변수 | 값 |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://sobunsobun-backend.up.railway.app` (끝에 슬래시 없이) |
   | `VITE_WS_BASE_URL` | `wss://sobunsobun-backend.up.railway.app` (`https` → `wss`로 바꾼 값) |
4. Deploy. 끝나면 퍼블릭 URL이 나온다 (예: `https://sobun-sobun.vercel.app`).

## 4. 다시 Railway로 — CORS 허용 Origin 채우기

1. Railway 서비스의 `ALLOWED_ORIGINS` 환경변수를 3번에서 받은 Vercel 주소로 바꾼다 (`https://sobun-sobun.vercel.app`, 여러 개면 쉼표로 구분).
2. 저장하면 Railway가 자동으로 재배포한다.

## 5. 확인

- 브라우저에서 Vercel URL 접속 → 온보딩(주소 검색 → 건물 등록) 화면이 정상 동작하는지 확인.
- 개발자도구 Network 탭에서 `/api` 요청에 CORS 에러가 없는지 확인 (있다면 4번의 `ALLOWED_ORIGINS` 값이 정확한지, 끝에 슬래시가 안 붙었는지 확인).
- 팟 상세 화면에서 WebSocket(`wss://.../ws-sobun/websocket`) 연결이 되는지 확인 (연결 안 되면 `VITE_WS_BASE_URL`이 `wss://`로 시작하는지 확인 — `ws://`로 두면 HTTPS 페이지에서 Mixed Content로 브라우저가 막는다).

## 6. 배포 후에도 계속 수정 가능

Railway·Vercel 둘 다 GitHub 연동 배포라서, 브랜치에 푸시하면 자동으로 다시 빌드·배포된다. 이 저장소는 `main`/`develop` 직접 푸시가 막혀 있으니([CONTRIBUTING.md](../CONTRIBUTING.md)), 각 플랫폼에서 "어느 브랜치를 배포할지"를 `develop`(또는 데모용 브랜치)로 지정해두고 평소처럼 PR을 머지하면 된다.

## 자주 나는 에러

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 프론트에서 API 호출이 CORS 에러로 막힘 | `ALLOWED_ORIGINS`에 Vercel 주소가 없거나 오타 | Railway Variables에서 값 확인 후 재배포 |
| WebSocket이 연결되자마자 끊김 | `VITE_WS_BASE_URL`이 `ws://`(비보안)로 돼 있음 | `wss://`로 수정 |
| Railway 배포 후 500/DB 에러 | Supabase URL에 `?sslmode=require`가 없음 | `SPRING_DATASOURCE_URL` 끝에 추가 |
| Railway 빌드가 느림(첫 배포) | Dockerfile이 Gradle 의존성을 매번 새로 받음 | 이후 배포부터는 Railway가 레이어 캐시를 재사용해서 빨라진다 |
