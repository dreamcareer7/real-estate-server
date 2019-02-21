CREATE TABLE IF NOT EXISTS crm_lists (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand uuid NOT NULL REFERENCES brands (id),

  created_at timestamptz DEFAULT clock_timestamp(),
  updated_at timestamptz DEFAULT clock_timestamp(),
  deleted_at timestamptz,

  created_by uuid NOT NULL REFERENCES users (id),
  updated_by uuid REFERENCES users (id),
  deleted_by uuid REFERENCES users (id),

  name text NOT NULL,
  touch_freq interval,
  is_editable boolean DEFAULT TRUE,

  is_and_filter boolean DEFAULT TRUE,
  query text
)
