CREATE TABLE super_campaigns_enrollments AS (
  id uuid PRIMARY KEY uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp,
  forked_at timestamp,
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  brand uuid REFERENCES brands (id),
  user uuid REFERENCES users (id),
  tags text[] NOT NULL,

  UNIQUE (super_campaign, brand, user)
);

CREATE INDEX super_campaigns_enrollments_campaign_brand_idx ON super_campaigns_enrollments (super_campaign, brand);
