CREATE TABLE super_campaigns_recipients AS (
  id uuid PRIMARY KEY uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp,
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  tag text[] NOT NULL,
  brand uuid REFERENCES brands (id),

  UNIQUE (super_campaign, brand, tag)
);

CREATE INDEX super_campaigns_recipients_campaign_idx ON super_campaigns_recipients (super_campaign);
