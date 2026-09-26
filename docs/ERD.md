# ERD 초안

실제 컬럼은 개발하면서 조정하되, 4개 도메인의 관계는 아래 구조를 기준으로 시작합니다.

```mermaid
erDiagram
    BUILDING ||--o{ POD : "건물 안에서 팟이 열린다"
    POD ||--o{ POD_PARTICIPANT : "참여자"
    POD ||--o| SETTLEMENT : "마감 후 정산 1건"
    USER ||--o{ POD_PARTICIPANT : "참여"
    USER ||--o{ BUILDING_AUTH : "건물 인증 기록"
    BUILDING ||--o{ BUILDING_AUTH : ""

    BUILDING {
        long id PK
        string name
        double latitude
        double longitude
    }
    BUILDING_AUTH {
        long id PK
        long building_id FK
        long user_id FK
        datetime verified_at
    }
    USER {
        long id PK
        string nickname
    }
    POD {
        long id PK
        long building_id FK
        string title
        decimal total_amount
        int participant_count
        decimal commission_rate
        boolean closed
    }
    POD_PARTICIPANT {
        long id PK
        long pod_id FK
        long user_id FK
        datetime joined_at
    }
    SETTLEMENT {
        long id PK
        long pod_id FK
        string receipt_image_url
        decimal recognized_cost
        decimal final_amount
        boolean confirmed
    }
```

## 메모

- `POD_PARTICIPANT`, `BUILDING_AUTH`는 아직 엔티티로 만들지 않았습니다 (담당자가 작업하며 추가).
- 최저가 조회(`PRODUCT`)는 다른 도메인과 직접적인 FK 관계가 없는 독립 캐시 테이블로 둡니다.
