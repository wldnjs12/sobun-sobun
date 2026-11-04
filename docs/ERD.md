# ERD

> **2026-11 개편**: 계정 테이블(`ACCOUNT`, `ACCOUNT_SESSION`) 추가, `POD`에 카테고리·미개봉 단위·상태 컬럼 추가, `USER`에 상세주소, `BUILDING`에 지번주소 추가. **(개편)** 표시 컬럼은 통합 시 이름이 확정될 수 있습니다. 의미와 규칙은 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) 7장.

```mermaid
erDiagram
    ACCOUNT ||--o| USER : "id 공유 (건물 등록 시 생성)"
    ACCOUNT ||--o{ ACCOUNT_SESSION : "로그인 세션"
    BUILDING ||--o{ POD : "개설 위치"
    BUILDING ||--o{ USER : "소속 주민"
    BUILDING ||--o{ COMMUNITY_POST : "작성 위치"
    POD ||--o{ POD_PARTICIPANT : "참여자"
    POD ||--o| SETTLEMENT : "마감 후 정산 1건"
    USER ||--o{ POD_PARTICIPANT : "참여"
    USER ||--o{ LOCATION_CHECK : "GPS 확인 기록"
    USER ||--o{ COMMUNITY_POST : "작성(내부 보관용)"
    COMMUNITY_POST ||--o{ COMMUNITY_COMMENT : "댓글"
    COMMUNITY_POST ||--o{ COMMUNITY_REPORT : "신고(글)"
    COMMUNITY_COMMENT ||--o{ COMMUNITY_REPORT : "신고(댓글)"

    ACCOUNT {
        long id PK "자동 생성, USER.id와 같은 값"
        string login_id UK "영문 소문자·숫자 4~20자"
        string password_hash "BCrypt"
        string nickname "2~10자, 본인에게만 노출"
        datetime created_at
    }
    ACCOUNT_SESSION {
        string token PK "랜덤 opaque 토큰"
        long account_id FK
        datetime created_at
        datetime expires_at "발급 + 30일"
    }
    BUILDING {
        long id PK
        string name "nullable(개편), 없으면 도로명+건물번호로 표시"
        string road_address
        string jibun_address "개편, nullable"
        string building_management_number "bdMgtSn, 도로명주소 API"
        string dong "nullable, 아파트만"
        string building_key UK "빌라 bdMgtSn / 아파트 bdMgtSn:동"
        double latitude
        double longitude
    }
    USER {
        long id PK "= ACCOUNT.id"
        long building_id FK "not null"
        string detail_address "개편, nullable, 본인에게만 노출"
        datetime created_at
    }
    LOCATION_CHECK {
        long id PK
        long user_id FK
        long building_id FK
        string purpose "POD_CREATE | POD_JOIN | COMMUNITY_ENTER"
        boolean success
        datetime checked_at
    }
    POD {
        long id PK
        long building_id FK "대표의 건물 (동네 판정 기준)"
        long host_user_id FK
        string category "개편, TISSUE|LAUNDRY|BATH|KITCHEN|CLEANING|DAILY|ETC"
        string title
        string description "개편, nullable, 500자"
        decimal total_amount
        int total_units "개편, 묶음 전체 개수"
        string unit_label "개편, 10자 (롤/팩/개/병)"
        int units_per_person "개편, 1인 몫(미개봉)"
        int target_participant_count "대표 포함"
        int participant_count "대표 포함"
        decimal commission_rate "기본 0.05"
        datetime deadline "표시용"
        string status "개편, OPEN|CLOSED|CANCELLED"
        boolean closed "호환용, status != OPEN"
        decimal original_price "nullable, 절약액 카드용"
        string pickup_pin "4자리, 생성 시 자동 발급"
        string pickup_note "개편, nullable, 100자"
    }
    POD_PARTICIPANT {
        long id PK
        long pod_id FK
        long user_id FK
        datetime joined_at
        datetime paid_at "nullable, 보냈어요 자가신고"
        datetime picked_up_at "nullable, 수령완료 자가신고"
    }
    SETTLEMENT {
        long id PK
        long pod_id FK
        string receipt_image_url
        decimal recognized_cost
        decimal commission_rate
        decimal final_amount
        int participant_count "확정 시점 스냅샷"
        decimal per_person_amount
        boolean confirmed
        string host_payment_link "nullable, 대표 개인 송금 링크/계좌"
    }
    COMMUNITY_POST {
        long id PK
        long building_id FK "작성자 건물 (동네 판정 기준)"
        long author_user_id FK "응답엔 절대 노출 안 함"
        string category "FREE | QUESTION | SHARE | GROUP_BUY_SUGGESTION"
        string content "2000자"
        datetime created_at
        int report_count
        boolean hidden "report_count >= 3이면 true"
    }
    COMMUNITY_COMMENT {
        long id PK
        long post_id FK
        long author_user_id FK "응답엔 절대 노출 안 함"
        string content "500자"
        datetime created_at
        int report_count
        boolean hidden
    }
    COMMUNITY_REPORT {
        long id PK
        string target_type "POST | COMMENT"
        long target_id FK
        long reporter_user_id FK
        datetime created_at
    }
```

## 메모

- **`ACCOUNT`와 `USER`를 나눈 이유**: `USER`는 "어느 건물 소속인가"이고 `building_id`가 not null이다. 계정은 건물 등록 전에도 있어야 하므로 따로 둔다. `ACCOUNT.id == USER.id`라서 기존 코드의 `userId`(Pod.hostUserId 등)를 그대로 쓸 수 있다. 기존 `users` 테이블 이름(PostgreSQL 예약어 `user` 회피)은 유지.
- **동네 판정**: 테이블에 "동네"를 저장하지 않는다. 요청할 때마다 내 `BUILDING` 좌표와 대상 `BUILDING` 좌표의 거리(≤ 1km)로 계산한다(`NeighborhoodService`). 그래서 `POD.building_id`, `COMMUNITY_POST.building_id`는 그대로 두면 된다.
- **노출 금지 컬럼**: `BUILDING.road_address/jibun_address/name/dong/latitude/longitude`, `USER.detail_address`, `ACCOUNT.nickname`, `*.author_user_id`는 다른 사용자 응답에 넣지 않는다. 다른 사용자에게는 법정동 이름(도로명주소 괄호에서 추출)과 대략 거리만.
- `BUILDING.building_key`는 서버가 계산하는 유니크 키. 상세주소는 키에 쓰지 않는다.
- `LOCATION_CHECK`는 원본 좌표를 저장하지 않고 판정 결과·시각·목적만 남긴다(개인정보 보호).
- 익명 닉네임("이웃 N"/"글쓴이")은 저장하지 않고 응답 조립 시점에 계산한다.
- 스키마는 `ddl-auto: update`로 자동 반영된다. 새 not null 컬럼을 기존 행이 있는 테이블에 추가할 때는 기본값이 필요하다(예: `POD.category`, `POD.status` — 통합 시 확인).
