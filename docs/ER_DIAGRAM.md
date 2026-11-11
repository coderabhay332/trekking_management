# ER Diagram - Trekking Management Application V2

Image version for the report: `docs/er_diagram.png` (also `docs/er_diagram.svg`).

```mermaid
erDiagram
    users ||--o| staff_profiles : "has (staff role)"
    staff_profiles ||--o{ treks : "is assigned to"
    users ||--o{ bookings : "makes"
    treks ||--o{ bookings : "receives"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        string role "admin | staff | trekker"
        string phone
        string address
        bool is_active
        bool is_blacklisted
        datetime created_at
    }
    staff_profiles {
        int id PK
        int user_id FK, UK
        string contact
        string specialization
        int experience_years
        string status "Active | Inactive"
    }
    treks {
        int id PK
        string name
        string location
        string difficulty "Easy | Moderate | Hard"
        int duration_days
        int total_slots
        int available_slots
        int staff_id FK
        string status "Pending | Approved | Open | Closed | Ongoing | Completed"
        date start_date
        date end_date
        float price
        text description
        text instructions
        datetime started_at
        datetime completed_at
        datetime created_at
    }
    bookings {
        int id PK
        int user_id FK
        int trek_id FK
        datetime booking_date
        string status "Booked | Cancelled | Completed"
        string payment_status "Pending | Paid | Refunded"
        float amount
        datetime cancelled_at
    }
```

## Relationships
- **users - staff_profiles (1 : 0..1):** every user with the `staff` role has exactly one staff profile; `user_id` is unique.
- **staff_profiles - treks (1 : N):** a staff member can be assigned many treks; a trek has at most one assigned staff member (`treks.staff_id`, nullable until assigned).
- **users - bookings (1 : N):** a trekker makes many bookings.
- **treks - bookings (1 : N):** a trek receives many bookings.

## Constraints
- `users.email` is unique.
- `bookings (user_id, trek_id)` is unique, which prevents duplicate bookings. A cancelled booking is reactivated if the user books again.
- Overbooking is prevented by an atomic `UPDATE treks SET available_slots = available_slots - 1 WHERE id = ? AND status = 'Open' AND available_slots > 0`.
- Exactly one admin user exists, created programmatically on first start (`backend/seed.py`).
