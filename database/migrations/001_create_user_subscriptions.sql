CREATE TABLE IF NOT EXISTS user_subscriptions (
    subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL UNIQUE,

    active_flag INTEGER NOT NULL DEFAULT 1 CHECK (active_flag IN (0, 1)),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    price_czk INTEGER CHECK (price_czk IS NULL OR price_czk >= 0),
    next_billing_date TEXT,
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (service_id)
        REFERENCES streaming_services(service_id)
        ON DELETE CASCADE
) STRICT;