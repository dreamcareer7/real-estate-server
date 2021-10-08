CREATE TABLE super_campaigns_recipients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp,
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  tags text[] NOT NULL,
  brand uuid REFERENCES brands (id),

  UNIQUE (super_campaign, brand, tags)
);

CREATE INDEX super_campaigns_recipients_campaign_idx ON super_campaigns_recipients (super_campaign);
