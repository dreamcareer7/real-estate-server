CREATE TABLE super_campaigns_email_campaigns AS (
  super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
  campaign uuid NOT NULL REFERENCES email_campaigns (id),
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),

  accepted smallint NOT NULL DEFAULT 0,
  rejected smallint NOT NULL DEFAULT 0,
  delivered smallint NOT NULL DEFAULT 0,
  failed smallint NOT NULL DEFAULT 0,
  opened smallint NOT NULL DEFAULT 0,
  clicked smallint NOT NULL DEFAULT 0,
  unsubscribed smallint NOT NULL DEFAULT 0,
  complained smallint NOT NULL DEFAULT 0,
  stored smallint NOT NULL DEFAULT 0,

  PRIMARY KEY (super_campaign, campaign)
)
