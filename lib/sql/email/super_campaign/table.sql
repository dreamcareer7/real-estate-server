CREATE TABLE super_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp DEFAULT clock_timestamp(),
  deleted_at timestamp,
  created_by uuid REFERENCES users (id),
  brand uuid not null REFERENCES brands (id),
  executed_at timestamp,
  due_at timestamp,
  tags text[],
  subject text,
  description text,
  template_instance uuid REFERENCES templates_instances (id)
);

CREATE INDEX super_campaigns_brand_idx ON super_campaigns USING BTREE (brand)
