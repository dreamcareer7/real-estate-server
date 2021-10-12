CREATE TABLE super_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp DEFAULT clock_timestamp(),
  deleted_at timestamp,
  created_by uuid REFERENCES users (id),
  brand uuid not null REFERENCES brands (id),
  executed_at timestamp,
  due_at timestamp,
  subject text,

  -- TODO: Discuss with Emil about the possibility of having to add templates
  template_instance uuid REFERENCES templates_instances (id)
)
