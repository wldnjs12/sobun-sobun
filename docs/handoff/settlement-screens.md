# 핸드오프: 팟 픽업PIN/절약액/정산 재조회 백엔드 + 연동

> ⚠️ **참고**: 2026-10-03 기획 개편으로 ②③에 "건물 소속 검증"이 추가될 예정입니다. 이 문서의 나머지 내용(픽업PIN, 절약액, 정산 재조회)은 여전히 유효합니다.

_최종 갱신: 2026-10-04 · 브랜치: feature/settlement-manual-entry (이전: feature/pod-settlement-backend-extras)_

PR #5(온보딩·정산·마이페이지 화면)가 먼저 develop에 머지돼서, 같은 화면을 중복 구현하지 않고 **백엔드 기능 추가 + 이미 머지된 화면에 연동**하는 것으로 범위를 좁혔습니다.

## 추가한 백엔드 (`docs/API_SPEC.md`/`docs/ERD.md`에 반영됨)

- `Pod.originalPrice`(선택) — 절약액 비교용
- `Pod.pickupPin`(4자리 자동발급) — `GET /pods/{id}/me`로 참여자 본인만 조회(비참여자 노출 방지)
- `PodParticipant.paidAt`/`pickedUpAt` 자가신고 — `POST /pods/{id}/paid`, `POST /pods/{id}/picked-up`
- `GET /pods/{id}/participants` (대표만) — 참여자별 송금/수령 현황
- `Settlement.hostPaymentLink`(선택, 개인 송금 링크) + `GET /settlements/{podId}` 재조회

카카오 알림톡 자동발송·토스페이먼츠 API 결제는 사업자 연동이 필요해 하켓톤 범위에서 불가능 — 위 자가신고/개인 링크로 대체(자세한 이유는 커밋 메시지·API_SPEC.md 참고).

## 이미 머지된 PR #5 화면에 연동한 것

PR #5 코드/PR 본문에 직접 적혀 있던 요청사항을 그대로 해결했습니다:

- `SettlementResultPage.jsx`: 기존엔 `localStorage`뿐이라 팟장 브라우저 아니면 결과를 못 봤음 → `GET /settlements/{podId}`로 서버 재조회하게 교체. `Pod.originalPrice` 있을 때만 절약액 카드 표시
- `PickupPage.jsx`: "보관 후 알려드려요" placeholder(+ TODO 주석) → 실제 `pickupPin` 표시. "수령 완료"가 로컬 state뿐이었던 것 → `POST /pods/{id}/picked-up` 자가신고로 교체(DB에 남음)
- `PodCreatePage.jsx`: "혼자 샀을 때 가격"(선택) 입력 필드 추가, `podApi.js`의 `originalPrice` placeholder(null 고정)를 실제 값으로 교체

## 2026-10-04 · 영수증 업로드 실패 시 수동 입력 fallback 보강 (최지원)

- **문제**: OCR 실패(인식 못 함·OCR 호출 실패)는 서버가 `success=false`로 돌려줘서 수동 입력 화면으로 잘 넘어갔지만, **업로드 자체가 실패**하면(JPG·PNG 아님, 10MB 초과, 서버 오류·연결 끊김) `SettlementPage`가 업로드 화면에 에러만 띄우고 멈춤 → 다시 찍을 수 없는 상황이면 정산이 막힘. `03-settlement.md`가 "fallback 없으면 정산 전체가 막히므로 필수"로 적은 요구사항 위반
- **수정**: 업로드 에러가 나면 에러 문구 아래에 "사진 없이 금액 직접 입력하기" 버튼 표시 → OCR 실패와 같은 review 화면(금액 칸 비움, "직접 입력해주세요" 안내)으로 이동. 실패한 사진 미리보기는 지움
- 버튼은 업로드 에러가 있을 때만 보임 — 평소에는 영수증 촬영 흐름을 그대로 유도
- 확인: 프론트 빌드 통과. 백엔드 없이 정산 화면이 열리지 않아(팟 조회 필요) **브라우저 확인은 못 함** → 리뷰 때 10MB 넘는 사진이나 GIF를 올려 버튼이 나오고 금액 입력 → 확정까지 가는지 확인 필요

## 검증

로컬 Postgres + Stub OCR로 재확인: 팟 생성(originalPrice 포함) → 참여 2명 → 마감 → 정산 확정 → **참여자 계정(팟장 아님)으로 결과 화면 접속 시 서버에서 결과를 다시 받아오는 것**, 절약액 카드, 실제 픽업 PIN 표시, "수령 완료"가 DB에 저장되는 것까지 브라우저로 직접 확인. 백엔드 테스트 59개 통과.

## 남은 것 / 다음 작업자 안내

- `hostPaymentLink`(개인 송금 링크) + `markPaid`("보냈어요") 자가신고는 백엔드는 완성됐지만 **PR #5 화면엔 UI가 없어서 아직 연동 안 함** — 결제 관련 UI를 디자인할 사람이 정해지면 `settlementApi.js`/`podApi.js`에 이미 있는 함수를 그대로 쓰면 됩니다.
- `SettlementService.confirm()`이 `pod.closed`를 확인하지 않는 문제(PR #6/문소원이 지적)는 이번에 안 건드렸습니다 — 다음에 확인 필요.
