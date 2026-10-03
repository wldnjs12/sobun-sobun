# ERD 초안

> ⚠️ **기획 개편(2026-10-03)**: QR 관련 컬럼·`PRODUCT` 테이블을 제거하고, 주소/GPS 기반 인증과 커뮤니티 테이블을 추가했습니다. 실제 반영은 [REPLAN_WORK_ASSIGNMENT.md](./REPLAN_WORK_ASSIGNMENT.md) 순서대로 진행됩니다.

실제 컬럼은 개발하면서 조정하되, 아래 구조를 기준으로 시작합니다.

```mermaid
erDiagram
    BUILDING ||--o{ POD : "건물 안에서 팟이 열린다"
    BUILDING ||--o{ USER : "건물에 등록된 주민"
    BUILDING ||--o{ COMMUNITY_POST : "건물 커뮤니티"
    POD ||--o{ POD_PARTICIPANT : "참여자"
    POD ||--o| SETTLEMENT : "마감 후 정산 1건"
    USER ||--o{ POD_PARTICIPANT : "참여"
    USER ||--o{ LOCATION_CHECK : "GPS 확인 기록"
    USER ||--o{ COMMUNITY_POST : "작성(내부 보관용)"
    COMMUNITY_POST ||--o{ COMMUNITY_COMMENT : "댓글"
    COMMUNITY_POST ||--o{ COMMUNITY_REPORT : "신고(글)"
    COMMUNITY_COMMENT ||--o{ COMMUNITY_REPORT : "신고(댓글)"

    BUILDING {
        long id PK
        string name "건물명(검색 결과의 buildingName)"
        string road_address
        string building_management_number "bdMgtSn, 도로명주소 API"
        string dong "nullable, 아파트만"
        string building_key UK "bdMgtSn + ':' + (dong 또는 빈문자열)"
        double latitude
        double longitude
    }
    USER {
        long id PK
        long building_id FK
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
        long building_id FK
        long host_user_id FK
        string title
        decimal total_amount
        int target_participant_count
        int participant_count
        decimal commission_rate
        datetime deadline
        boolean closed
        decimal original_price "nullable, 절약액 카드용"
        string pickup_pin "4자리, 생성 시 자동 발급"
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
        long building_id FK
        long author_user_id FK "응답엔 절대 노출 안 함, 신고처리용 내부 보관"
        string category "FREE | QUESTION | SHARE | GROUP_BUY_SUGGESTION"
        string content
        datetime created_at
        int report_count
        boolean hidden "report_count >= 3(임시)이면 true"
    }
    COMMUNITY_COMMENT {
        long id PK
        long post_id FK
        long author_user_id FK "응답엔 절대 노출 안 함"
        string content
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

- `USER`가 처음으로 생기는 엔티티입니다. 로그인이 없어 지금처럼 임의의 숫자 `userId`를 쓰지만, 이 테이블이 "이 userId가 어느 건물 소속인지"의 근거가 되어 건물 소속 검증(`BuildingAccessService`)에 쓰입니다.
- `BUILDING.building_key`는 서버가 계산해서 저장하는 유니크 키입니다. 빌라/원룸은 `bdMgtSn`만, 아파트는 `bdMgtSn + 동`까지 같아야 같은 건물로 취급합니다.
- `LOCATION_CHECK`는 원본 좌표를 저장하지 않고 판정 결과·시각·목적만 남깁니다(개인정보 보호 — [기획수정_프롬포트.md](../기획수정_프롬포트.md) 1-3절).
- `COMMUNITY_POST`/`COMMUNITY_COMMENT`의 `author_user_id`는 DB에는 있지만 **API 응답에는 절대 포함하지 않습니다** — 익명 닉네임("이웃 N"/"글쓴이")은 응답 조립 시점에 매번 계산하고 저장하지 않습니다.
- `POD.target_participant_count` 도달 시에만 마감(기존과 동일, 변경 없음).
- `BUILDING_AUTH`(과거 QR 인증 기록 테이블)와 `PRODUCT`(최저가 캐시 테이블)는 **삭제됩니다.**
