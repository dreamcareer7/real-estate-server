CREATE TABLE IF NOT EXISTS crm_associations (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  brand uuid REFERENCES brands(id) NOT NULL,
  created_by uuid REFERENCES users(id) NOT NULL,
  deleted_by uuid REFERENCES users(id) NOT NULL,
  association_type crm_association_type NOT NULL,
  crm_task uuid REFERENCES crm_tasks(id),
  deal uuid NOT NULL REFERENCES deals(id),
  contact uuid NOT NULL REFERENCES contacts(id),
  listing uuid NOT NULL REFERENCES listings(id),
  email uuid NOT NULL REFERENCES email_campaigns(id),
  index integer,
  metadata json
)
