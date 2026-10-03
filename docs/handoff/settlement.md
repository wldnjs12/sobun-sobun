# 핸드오프 — ③ 대표 수고비 정산 API (`feature/settlement`)

> ⚠️ **참고**: 2026-10-03 기획 개편으로 ③정산에 "건물 소속 검증"과 `hostPaymentLink` 프론트 UI가 추가될 예정입니다. 이 문서의 나머지 내용(OCR, 정산 계산)은 여전히 유효합니다 — 변경분은 [features/03-settlement.md](../features/03-settlement.md) 참고.

담당: 문소원(백엔드) · 프론트 페어: 홍수진 · PR: [#2](https://github.com/wldnjs12/sobun-sobun/pull/2) (→ `develop`, 머지됨), [#7](https://github.com/wldnjs12/sobun-sobun/pull/7) (결과 조회 API) · 관련 문서: [03-settlement](../features/03-settlement.md), [API_SPEC ③](../API_SPEC.md), [ERD](../ERD.md), [API_KEYS](../API_KEYS.md)

_최종 갱신: 2026-10-03_

## 1. 한 줄 요약

영수증 사진을 Naver Clova OCR(일반 도메인)로 읽어 총액을 뽑는 `POST /api/settlements/receipts`와, 대표가 확인한 원가에 수고비율을 반영해 1인당 금액을 확정하는 `POST /api/settlements/{podId}/confirm`, 확정된 결과를 다른 기기에서도 볼 수 있게 하는 `GET /api/settlements/{podId}`를 구현했다. **OCR이 실패해도 에러가 아니라 `200` + `data.success=false`로 내려가서, 프론트가 수동 입력 폼으로 넘어갈 수 있다.**

## 2. API 명세

### 2-1. 영수증 인식 `POST /api/settlements/receipts`

| 구분 | 내용 |
| --- | --- |
| 요청 | `multipart/form-data`, 파트 이름 `receipt` (JPG 또는 PNG, 10MB 이하) |
| 인식 성공 | `200` · `{ "success": true, "data": { "recognizedAmount": 12300, "success": true }, "message": null }` |
| **인식 실패** | `200` · `{ "success": true, "data": { "recognizedAmount": null, "success": false }, "message": null }` |
| 파일 거절 | `400` · `{ "success": false, "data": null, "message": "..." }` |

**인식 실패(= 200 + `data.success=false`)가 되는 경우** — 프론트는 이때 수동 입력 폼을 띄운다

- OCR 호출 실패 (네트워크 오류, 연결 3초 / 응답 10초 타임아웃, OCR 서버 4xx·5xx)
- Clova가 `inferResult != SUCCESS`로 응답 (글자 흐림 등)
- 텍스트는 읽었지만 "합계 / 총액 / 총금액 / 결제금액" 근처에서 금액을 못 찾음

> 바깥 `success`는 "요청 처리 성공", 안쪽 `data.success`는 "금액 인식 성공"이다. 바깥만 보면 실패를 놓친다.

**총액 추출 규칙**: 키워드("합 계"처럼 글자 사이 공백 허용)가 있는 줄에서 키워드 뒤 숫자를 모으고, 그 줄에 숫자가 없으면 다음 줄 첫 숫자를 쓴다. 후보 중 **가장 큰 값**을 총액으로 본다 ("과세물품 합계", "합계 수량 3" 같은 작은 값보다 결제 총액이 보통 크기 때문).

### 2-2. 정산 확정 `POST /api/settlements/{podId}/confirm`

| 구분 | 내용 |
| --- | --- |
| 요청 | `Content-Type: application/json` · `{ "recognizedCost": number, "commissionRate": number }` |
| 성공 | `200` · `{ "success": true, "data": Settlement, "message": null }` |
| 거절 | `400` · `{ "success": false, "data": null, "message": "..." }` |

계산 (전부 `BigDecimal`):

```
finalAmount     = recognizedCost × (1 + commissionRate)   → 원 단위 반올림(HALF_UP)
perPersonAmount = (반올림 전 최종 금액) ÷ participantCount  → 원 단위 올림(CEILING)
participantCount = 확정 시점 Pod.participantCount (스냅샷으로 저장)
```

**예시** — 원가 12,300원, 수고비 5%, 참여자 3명

```http
POST /api/settlements/1/confirm
Content-Type: application/json

{ "recognizedCost": 12300, "commissionRate": 0.05 }
```

```json
// 성공 (200)
{
  "success": true,
  "data": {
    "id": 1, "podId": 1, "receiptImageUrl": null,
    "recognizedCost": 12300, "commissionRate": 0.05,
    "finalAmount": 12915, "participantCount": 3, "perPersonAmount": 4305,
    "confirmed": true
  },
  "message": null
}

// 거절 (400) — 같은 팟을 다시 확정
{ "success": false, "data": null, "message": "이미 정산이 확정된 팟이에요." }
```

### 2-3. 확정 결과 조회 `GET /api/settlements/{podId}`

| 구분 | 내용 |
| --- | --- |
| 확정된 정산 있음 | `200` · `{ "success": true, "data": Settlement, "message": null }` (2-2 확정 응답과 같은 필드) |
| **확정 전 / 없는 팟** | `200` · `{ "success": true, "data": null, "message": null }` |

- 미확정을 에러가 아닌 `data: null`로 주는 이유: 공용 `client.js`는 `success=false`면 예외를 던진다. 정상 응답에 `null`을 줘야 화면이 에러 처리 없이 "정산 대기"를 바로 그릴 수 있다. 대신 "확정 전"과 "없는 팟"은 구분되지 않는다.
- 다시 조회할 때 금액은 DB 값 그대로라 `12915.00`처럼 소수점 둘째 자리까지 온다 (확정 직후 응답은 `12915`). 프론트는 `Number()`로 변환해서 쓴다.
- `pod_id` 유니크 제약이 없어 같은 팟의 정산이 2건일 수 있으므로, 가장 최근 확정 건 하나를 돌려준다.

### 2-4. 400 거절 케이스 (`code` 없음, `message`를 화면에 그대로 표시)

| API | 조건 | message |
| --- | --- | --- |
| receipts | `receipt` 파트 누락 또는 빈 파일 | 영수증 사진을 선택해주세요. |
| receipts | JPG/PNG 아님 (Content-Type이 아니라 파일 앞부분 시그니처로 판별) | JPG 또는 PNG 사진만 올릴 수 있어요. |
| receipts | 10MB 초과 | 사진 용량은 10MB 이하만 올릴 수 있어요. |
| receipts | 업로드된 파일 읽기 실패 | 사진을 읽지 못했어요. 다시 올려주세요. |
| confirm | 원가 누락·0 이하 (요청 바디 없음 포함) | 영수증 금액은 0원보다 커야 해요. |
| confirm | 원가에 소수점 | 영수증 금액은 원 단위 정수로 입력해주세요. |
| confirm | 수고비율 누락·0~1 밖 | 수고비율은 0%에서 100% 사이여야 해요. |
| confirm | 수고비율이 0.01 단위 아님 (예: 0.055) | 수고비율은 1% 단위로 입력해주세요. |
| confirm | 없는 팟 | 팟을 찾을 수 없어요. |
| confirm | 참여자 0명 | 참여자가 없는 팟은 정산할 수 없어요. |
| confirm | 이미 확정된 팟 | 이미 정산이 확정된 팟이에요. |

> ⚠️ 없는 팟은 ② 팟 API(`404`)와 달리 `400`이다. JSON 형식이 깨졌거나 업로드가 15MB(multipart 한도)를 넘으면 공통 응답 래퍼가 아닌 Spring 기본 에러가 내려온다 (정확한 상태 코드는 확인 못 함).

## 3. 변경 사항

**DB / 엔티티**

| 테이블 | 변경 |
| --- | --- |
| `settlement` | 컬럼 추가: `commission_rate`, `participant_count`(확정 시점 스냅샷), `per_person_amount` · 확정 시 `confirmed=true`로 저장 |

`ddl-auto: update`라 앱 실행 시 자동 반영된다. `pod_id` 유니크 제약은 없다 (6번 참고). `docs/ERD.md`의 `SETTLEMENT`에는 아직 새 컬럼이 반영되지 않았다.

**파일** (`backend/src/main/java/com/ppuri/sobunsobun/settlement/` 기준)

- `controller/SettlementController` — `POST /{podId}/confirm`, `GET /{podId}` 추가, `SettlementException`·`receipt` 파트 누락 → 400 변환
- `service/SettlementService` — 파일 검증, OCR 호출 + 총액 추출, 확정 계산·검증·저장, 확정 결과 조회(`findConfirmed`)
- `service/ReceiptOcrClient` (인터페이스), `NaverReceiptOcrClient`, `StubReceiptOcrClient`, `ReceiptOcrConfig` — 키가 있으면 Naver, 없으면 Stub
- `service/ReceiptAmountExtractor` — OCR 텍스트에서 총액 추출 (정규식)
- `service/PodParticipantCountReader` (인터페이스), `PodTableParticipantCountReader` — 참여자 수 조회 임시 구현 (5번)
- `domain/Settlement` — 컬럼 3개 + 생성자 추가, `domain/SettlementRepository`(최근 확정 건 조회 `findFirstByPodIdAndConfirmedTrueOrderByIdDesc` 포함), `domain/SettlementException` — 신규
- `dto/SettlementConfirmRequest`, `dto/SettlementResponse` — 신규 (`dto/ReceiptOcrResult`는 기존 그대로)
- `backend/src/main/resources/application.yml` — multipart 한도 15MB (기본 1MB는 휴대폰 사진에 부족)
- 테스트 33개: `ReceiptAmountExtractorTest`(6), `ReceiptOcrClientTest`(3), `ReceiptRecognizeTest`(8), `SettlementConfirmTest`(14), `SettlementFindTest`(2)

**다른 도메인 영향**

- `pod` 패키지 코드는 수정·import하지 않았다. 대신 `Pod` 엔티티의 `participantCount` 필드를 JPQL 문자열로 읽는다 (7번 지원님 항목).
- `application.yml`(공통): multipart 설정만 추가.

## 4. 로컬 테스트 방법

1. **단위 테스트**: `cd backend && ./gradlew test`
   > 💡 Windows에서 사용자 폴더 이름이 한글이면 `Could not find or load main class ...GradleWorkerMain`로 실패한다. `GRADLE_USER_HOME=C:\gradle-home`(영문 경로)을 설정하면 해결된다.
2. **앱 실행**: PostgreSQL을 켜고 `./gradlew bootRun`. 기동 로그에 `영수증 OCR: 키가 없어 Stub 사용`이 보이면 Stub(어떤 사진이든 합계 12,300원)으로 동작하는 것이다. 실제 OCR은 `application-local.yml`(gitignore) 또는 환경변수 `NAVER_OCR_INVOKE_URL` / `NAVER_OCR_SECRET_KEY`를 설정한다 ([API_KEYS](../API_KEYS.md)).
3. **테스트 건물**: 팟 생성에는 `building` 행이 필요하다 (② 서버가 `buildingId` 존재 검증). 앱을 한 번 실행해 테이블이 만들어진 뒤 [qr-auth 핸드오프](./qr-auth.md) 4번처럼 건물을 넣는다.
4. **전체 흐름** (건물 id=1, 사용자 1=대표, 2·3=참여자 기준):
   ```bash
   # 팟 생성 (참여자 0명으로 시작) → 응답의 data.id가 podId
   curl -X POST http://localhost:8080/api/pods -H "Content-Type: application/json" \
     -d '{"buildingId":1,"hostUserId":1,"title":"양파 5kg","totalAmount":12300,"targetParticipantCount":3,"commissionRate":0.05}'
   # 대표 포함 3명 참여 → 마감
   curl -X POST "http://localhost:8080/api/pods/1/join?userId=1"
   curl -X POST "http://localhost:8080/api/pods/1/join?userId=2"
   curl -X POST "http://localhost:8080/api/pods/1/join?userId=3"
   curl -X POST "http://localhost:8080/api/pods/1/close?hostUserId=1"
   # 영수증 인식 (아무 JPG/PNG 파일, Stub이면 12300)
   curl -X POST http://localhost:8080/api/settlements/receipts -F "receipt=@receipt.jpg"
   # 정산 확정 → finalAmount 12915, perPersonAmount 4305
   curl -X POST http://localhost:8080/api/settlements/1/confirm -H "Content-Type: application/json" \
     -d '{"recognizedCost":12300,"commissionRate":0.05}'
   # 다시 확정 → 400 "이미 정산이 확정된 팟이에요."
   # 결과 조회 → 확정 전이면 data: null, 확정 후면 위 결과 (금액은 12915.00 형식)
   curl http://localhost:8080/api/settlements/1
   ```
   > 💡 Windows Git Bash에서는 curl 인자에 한글을 직접 넣으면 UTF-8로 전달되지 않아 `400 JSON parse error: Invalid UTF-8 middle byte`가 난다. 한글이 든 JSON은 UTF-8 파일로 저장해 `--data-binary @pod.json`으로 보내면 된다.
5. **OCR 실패 흐름 확인**: 이미지가 아닌 파일을 `.jpg`로 바꿔 올리면 400, 진짜 사진인데 키가 잘못됐으면 200 + `data.success=false`.

> ✅ 2026-10-03 `develop`(`f3d6307`) + 로컬 PostgreSQL + Stub OCR로 4번 흐름을 curl로 확인했다. 응답은 위 주석 그대로였다 (인식 12300, 확정 `finalAmount 12915` / `participantCount 3` / `perPersonAmount 4305`, 재확정 400). 이미지 아닌 파일, `receipt` 파트 누락, 없는 팟, 참여자 0명도 2-4의 400 메시지 그대로 나왔다. 결과 조회(`GET`)는 PR #7 브랜치에서 같은 방식으로 확인했다 (확정 전 `data: null` → 확정 후 결과 반환, 없는 팟 `data: null`).
>
> ⚠️ 같은 확인에서 **마감하지 않은 팟도 확정되고, 확정 뒤에도 참여가 된다**는 것을 확인했다 (팟장 1명 상태로 확정 → 1인당 10,500원 저장 → 이후 2번째 사용자 참여 성공, 정산은 1명 기준 그대로). 6번 "참여자 수" 항목 참고.
>
> ⚠️ 실제 Clova OCR 키로 호출하는 것은 아직 검증하지 않았다 (응답 파싱은 샘플 JSON으로만 테스트). 5번의 "키가 잘못됐을 때 200 + `data.success=false`"도 코드와 단위 테스트 기준이다.

## 5. 임시 처리 / TODO

- **`PodTableParticipantCountReader`** (TODO 주석 있음): 작업 당시 develop에 `PodRepository`가 없어서, `select p.participantCount from Pod p where p.id = :podId` JPQL로 참여자 수를 읽기 전용 조회한다. 이제 develop에 ②의 `PodRepository`가 들어왔으니 그걸 쓰는 구현체로 바꿀 수 있다 (`PodParticipantCountReader` 인터페이스는 그대로, 구현체만 교체).
- **로그인 없음**: 확정 API는 사용자를 받지 않는다. 대표가 아닌 사람도 어떤 팟이든 확정할 수 있다. ①의 `X-User-Id`나 ②의 `hostUserId` 같은 임시 식별도 아직 안 붙였다.
- **Stub OCR**: 키가 없으면 어떤 사진이든 `success=true, 12,300원`. 데모 서버에서 키 설정이 빠지면 실패로 드러나지 않고 가짜 금액이 나가므로, 데모 전 기동 로그로 어느 구현체인지 확인할 것.
- **영수증 원본 저장 안 함**: `receiptImageUrl`은 항상 `null`.

## 6. 미결정 사항 / 가정 (팀 논의 필요)

| 항목 | 현재 가정 |
| --- | --- |
| 같은 팟 중복 확정 | 400으로 거절. DB 유니크 제약은 없어서 동시에 두 번 요청하면 2건 저장될 수 있음. 확정 후 수정·취소 방법 없음 |
| 반올림 | 최종 금액은 반올림, 1인당은 올림 → 대표가 최대 (참여자 수 − 1)원 더 받을 수 있음. 1인당은 반올림 전 금액으로 나눠서 `perPersonAmount × 인원`이 `finalAmount`보다 클 수 있음 (예: 12,345원·5%·4명 → 최종 12,962, 1인당 3,241 × 4 = 12,964) |
| 참여자 수 | 확정 시점 `Pod.participantCount`. 팟 마감 여부·대표 포함 여부는 확인 안 함 |
| 수고비율 | 요청값 사용(`Pod.commissionRate`와 대조 안 함), 0~100% · 1% 단위. 원가는 원 단위 정수만 |
| 수동 수정 금액 경고 기준 | 서버 미구현 (OCR 결과를 저장하지 않아 비교 불가 → UI 처리) |
| 총액 추출 / 파일 | 키워드 근처 숫자 중 최댓값 / JPG·PNG만 허용 / OCR 타임아웃 연결 3초·응답 10초, 재시도 없음 |
| 권한·404 | 로그인이 없어 아무나 어떤 팟이든 확정 가능, 없는 팟도 404가 아닌 400 |

## 7. 누가 알아야 하나

- **홍수진 (프론트, 정산 화면 S8~S12)**
  - 영수증 업로드 응답은 OCR이 실패해도 바깥 `success`가 `true`다. **`data.success === false`면 수동 입력 폼으로 전환**하고, `recognizedAmount`가 있으면 입력칸에 미리 채운다.
  - 공용 `src/api/client.js`의 `api.post`는 `Content-Type: application/json`을 고정하고 `JSON.stringify`를 해서 **파일 업로드에 쓸 수 없다**. `FormData`에 `receipt`로 담아 `fetch`를 직접 호출하고, `Content-Type`은 지정하지 않는다 (브라우저가 boundary를 붙임).
  - 확정 거절(400)은 `message`를 그대로 보여주면 된다. 화면에 쓸 값은 `finalAmount`, `perPersonAmount`, `participantCount`.
- **최지원 (② 팟 백엔드)**
  - 정산은 `Pod` 엔티티의 **`participantCount` 필드(Integer)** 를 JPQL 문자열로 읽는다. 필드 이름·타입을 바꾸거나 참여자 수 의미를 바꾸면(예: 대표 제외) 컴파일은 되지만 **실행 중 정산 확정이 깨진다** (정산 테스트는 이 조회를 mock으로 대체해서 못 잡음).
  - 정산 확정은 `closed`를 확인하지 않는다. 확정 후에도 팟이 열려 있으면 참여/취소로 인원이 바뀔 수 있으니, "마감된 팟만 확정" 규칙을 어디서 막을지 같이 정해야 한다.
  - `PodRepository`가 develop에 들어왔으니 `PodTableParticipantCountReader`를 그쪽으로 교체해도 될지 확인 부탁.
- **도우현 (프론트, 팟 화면)**
  - 팟장이 마감한 뒤 `/settlements/:podId`로 이동한다 (PR #4 `PodCompletePage`의 "영수증 올리고 정산 요청하기" 버튼). 경로 파라미터는 **팟 id**다.
  - 정산 참여자 수는 서버의 `participantCount`를 그대로 쓰기 때문에, 팟 생성 직후 팟장 참여(`joinPod`)가 실패해서 0명으로 남으면 마감도 정산도 안 된다.
  - 정산 결과를 지금은 팟장 브라우저 localStorage(`getSavedSettlement`)에만 두고 있다. `GET /settlements/{podId}`로 바꿔야 다른 기기의 참여자도 결과를 본다. 바꿀 곳: `SettlementResultPage.jsx`(state 없을 때 조회, `null`이면 대기 화면), `SettlementPage.jsx`(진입 시 이미 정산했는지 확인), `MyPage.jsx`(팟별 정산 상태).

## 8. 다음 작업

- [x] PR #2 `develop` 머지
- [ ] `docs/ERD.md`의 `SETTLEMENT`에 `commission_rate`, `participant_count`, `per_person_amount` 반영
- [ ] 6번 미결정 사항 팀 논의 → 결정되면 코드·이 문서 갱신
- [ ] `PodTableParticipantCountReader` → `PodRepository` 기반 구현체로 교체
- [ ] 실제 Clova OCR 키로 영수증 몇 장 인식률 확인
- [x] 로컬 DB에서 4번 전체 흐름 curl 확인 (Stub OCR 기준)
- [ ] 정산 확정을 마감된 팟에만 허용할지 지원님과 결정
- [x] 확정 결과 조회 API `GET /settlements/{podId}` (PR #7)
- [ ] 프론트 3곳을 `getSavedSettlement` 대신 결과 조회 API로 전환 (도우현)
