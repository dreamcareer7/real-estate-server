CREATE TABLE IF NOT EXISTS crm_tasks (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_by uuid NOT NULL REFERENCES users(id),
    brand uuid REFERENCES brands(id),

    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,

    title TEXT,
    "description" TEXT,
    due_date timestamptz,
    "status" TEXT,
    "type" TEXT,

    "notification" uuid uuid REFERENCES notifications(id)
)
