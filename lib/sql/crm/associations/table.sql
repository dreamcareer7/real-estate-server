CREATE TABLE IF NOT EXISTS crm_associations (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  association_type crm_association_type NOT NULL,
  crm_task uuid REFERENCES crm_tasks(id),
  crm_activity uuid REFERENCES crm_activities(id),
  -- contact_note uuid REFERENCES contacts_notes(id),
  deal uuid NOT NULL REFERENCES deals(id),
  contact uuid NOT NULL REFERENCES contacts(id),
  listing uuid NOT NULL REFERENCES listings(id),
)