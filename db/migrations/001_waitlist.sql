CREATE TABLE IF NOT EXISTS waitlist_signups (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    interest TEXT NOT NULL DEFAULT 'alpha',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS
waitlist_signups_email_unique
ON waitlist_signups (LOWER(email));
