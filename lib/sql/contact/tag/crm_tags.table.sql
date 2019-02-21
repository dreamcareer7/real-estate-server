CREATE TABLE IF NOT EXISTS crm_tags (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand uuid NOT NULL REFERENCES brands(id),

  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,

  created_by uuid NOT NULL REFERENCES users(id),
  updated_by uuid NOT NULL REFERENCES users(id),
  deleted_by uuid REFERENCES users(id),

  tag text NOT NULL,

  UNIQUE (brand, tag)
);
