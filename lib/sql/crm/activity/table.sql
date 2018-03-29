CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  created_by uuid NOT NULL REFERENCES users(id),
  brand uuid REFERENCES brands(id),

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,

  "description" text,
  "activity_type" text not null,
  outcome text,
  "timestamp" timestamptz not null
)

CREATE INDEX crm_activities_created_by_idx ON crm_activities (created_by)
CREATE INDEX crm_activities_trgm_idx ON crm_activities USING gin (description gin_trgm_ops)