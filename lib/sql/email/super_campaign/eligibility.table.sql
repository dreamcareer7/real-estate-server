CREATE TABLE super_campaigns_eligibility (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp,
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  brand uuid REFERENCES brands (id),

  UNIQUE (super_campaign, brand, tags)
);

CREATE INDEX super_campaigns_eligibility_super_campaign_idx ON super_campaigns_eligibility (super_campaign);
