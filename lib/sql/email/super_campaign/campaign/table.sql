CREATE TABLE super_campaigns_email_campaigns AS (
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  brand uuid NOT NULL REFERENCES brands (id),
  campaign uuid NOT NULL REFERENCES email_campaigns (id),
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  forked_at timestamp,
  deleted_at timestamp,
  deleted_by uuid REFERENCES users (id),

  accepted smallint NOT NULL DEFAULT 0,
  rejected smallint NOT NULL DEFAULT 0,
  delivered smallint NOT NULL DEFAULT 0,
  failed smallint NOT NULL DEFAULT 0,
  opened smallint NOT NULL DEFAULT 0,
  clicked smallint NOT NULL DEFAULT 0,
  unsubscribed smallint NOT NULL DEFAULT 0,
  complained smallint NOT NULL DEFAULT 0,
  stored smallint NOT NULL DEFAULT 0,

  PRIMARY KEY (super_campaign, brand)
)
