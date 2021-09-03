CREATE TABLE super_campaigns AS (
  id uuid PRIMARY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp DEFAULT clock_timestamp(),
  deleted_at timestamp,
  created_by uuid REFERENCES users (id),
  brand uuid not null REFERENCES brands (id),
  executed_at timestamp,
  due_at timestamp,
  subject text not null,
  template_instance uuid not null REFERENCES templates_instances (id)
)
