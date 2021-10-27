CREATE TABLE super_campaigns_eligibility (
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  brand uuid NOT NULL REFERENCES brands (id),
  created_at timestamp DEFAULT now(),

  PRIMARY KEY (super_campaign, brand)
);
