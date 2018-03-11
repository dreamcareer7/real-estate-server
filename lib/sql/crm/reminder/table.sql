CREATE TABLE IF NOT EXISTS reminders (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,

    is_relative boolean,
    "timestamp" timestamptz,

    task uuid REFERENCES tasks(id),
    notification REFERENCES notifications(id)
)