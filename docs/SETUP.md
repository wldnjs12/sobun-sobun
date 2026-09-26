# 로컬 개발 환경 설정 가이드

처음 이 저장소를 클론한 팀원이 백엔드/프론트를 로컬에서 띄우기까지의 전체 과정입니다. Mac 기준(`brew`)으로 적었고, Windows는 괄호로 대체 방법을 표시했습니다.

## 0. 사전 준비물 확인

```bash
java -version   # 17 이상이어야 함
node -v         # 20 이상이어야 함
psql --version  # 14 이상 (없으면 아래 1번에서 설치)
git --version
```

## 1. PostgreSQL 설치 및 DB 생성

**Mac (Homebrew)**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows**: https://www.postgresql.org/download/windows/ 에서 설치 마법사로 설치 (설치 중 비밀번호 설정 화면이 나옵니다).

설치 후, `backend/src/main/resources/application.yml`에 맞는 계정/DB를 만들어주세요.

```bash
psql postgres
```
psql 프롬프트 안에서:
```sql
CREATE USER sobunsobun WITH PASSWORD 'sobunsobun';
CREATE DATABASE sobunsobun OWNER sobunsobun;
\q
```

확인:
```bash
psql -U sobunsobun -d sobunsobun -h localhost
# 비밀번호 sobunsobun 입력 후 접속되면 성공. \q 로 종료.
```

## 2. 저장소 클론

```bash
git clone https://github.com/wldnjs12/sobun-sobun.git
cd sobun-sobun
```

## 3. 외부 API 키 설정 (필요한 사람만)

영수증 OCR(③)이나 최저가 조회(④)를 개발/테스트하려면 API 키가 필요합니다. 자세한 발급 방법은 [API_KEYS.md](./API_KEYS.md) 참고. 키가 아직 없어도 나머지 개발(화면, 팟 로직 등)은 진행할 수 있습니다.

키가 있다면 `backend/src/main/resources/application-local.yml.example`을 복사해서 `application-local.yml`로 만들고 값을 채워주세요(이 파일은 git에 올라가지 않습니다).

```bash
cd backend/src/main/resources
cp application-local.yml.example application-local.yml
# application-local.yml을 열어 실제 키 값 입력
```

## 4. 백엔드 실행

**IntelliJ로 실행 (추천)**
1. IntelliJ에서 `backend` 폴더를 프로젝트로 열기 (저장소 최상위가 아니라 `backend` 폴더 자체!)
2. Gradle sync 끝날 때까지 대기
3. `SobunsobunApplication` 우클릭 → Run
4. 3번에서 `application-local.yml`을 만들었다면, Run Configuration의 "Active profiles"에 `local` 입력 후 재실행

**터미널로 실행**
```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

정상이면 콘솔에 `Tomcat started on port 8080` 같은 로그가 뜹니다.

## 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` 접속해서 화면이 뜨면 성공. (`/api` 요청은 자동으로 8080 백엔드로 프록시됩니다, `vite.config.js` 참고.)

## 6. 정상 동작 체크리스트

- [ ] 백엔드 콘솔에 에러 없이 `Started SobunsobunApplication` 로그가 보인다
- [ ] `psql -U sobunsobun -d sobunsobun -h localhost`로 접속되고, 백엔드 첫 실행 시 테이블이 자동 생성됐다(`\dt`로 확인)
- [ ] `http://localhost:5173`에서 프론트 화면이 뜬다
- [ ] 프론트에서 아무 버튼이나 눌렀을 때 콘솔에 `/api` 요청이 CORS 에러 없이 나간다

## 자주 나는 에러

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| `Connection to localhost:5432 refused` | PostgreSQL이 안 떠 있음 | `brew services start postgresql@16` |
| `password authentication failed for user "sobunsobun"` | 1번에서 계정을 안 만들었거나 비밀번호가 다름 | 1번 다시 실행 |
| Gradle sync가 계속 실패함 | 인터넷 연결 문제 또는 프록시 | 네트워크 확인, IntelliJ 재시작 |
| 프론트에서 API 호출 시 CORS 에러 | 백엔드를 안 거치고 직접 포트로 호출함 | 반드시 `/api/...` 상대경로로 호출 (vite 프록시 사용) |
| `./gradlew: Permission denied` | 실행 권한 없음 | `chmod +x gradlew` |
