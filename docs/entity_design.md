erDiagram
    user {
        int id PK
        string name
        string email
        date created_at
    }
    print_project {
        int id PK
        int user_id FK
        string name
        string status
        date created_at
    }
    print_item {
        int id PK
        string name
        date created_at
        jsonb blob_html
        jsonb blob_css
        jsonb asset_links
        jsonb data_mapping
        jsonb data_set
    }
    print_template {
        int order_id FK
        string name
        date created_at
    }

    user ||--o{ print_project : designs
    print_project ||--|{ print_item : contains
    print_template ||--o{ print_item : "included in"
