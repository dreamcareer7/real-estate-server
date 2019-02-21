CREATE TABLE crm_lists_members (
  list uuid REFERENCES crm_lists(id) NOT NULL,
  contact uuid REFERENCES contacts(id) NOT NULL,
  is_manual boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
)
