CREATE TABLE super_campaigns_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp,
  -- forked_at timestamp,

  -- used to distinguish enrollment cause...
  -- - NULL value means automatic enrollment (created_by IS NULL)
  -- - means self enrollment when it's same as the "user" (created_by = "user")
  -- - otherwise it's an admin enrollment
  created_by uuid REFERENCES users (id),

  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  brand uuid REFERENCES brands (id),
  "user" uuid REFERENCES users (id),

  -- should we have a separate field for custom admin/agent tags? doesn't seem likely
  tags text[] NOT NULL,

  UNIQUE (super_campaign, brand, "user")
);
