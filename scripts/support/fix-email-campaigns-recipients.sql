WITH problematic_triggers as (
  SELECT t.id, t.scheduled_after
    FROM
      triggers t
    JOIN email_campaigns ec
      ON t.campaign = ec.id
    LEFT JOIN email_campaigns_recipients ecr
      ON ec.id = ecr.campaign
    WHERE
      ecr.id IS NULL
)
WITH parent_triggers as (
  SELECT
    t.brand, t.campaign,
    ec.from, ecr.tag, ecr.list, ecr.contact,
    ecr.email, ecr.send_type, ecr.recipient_type,
    ecr.agent
  FROM
    triggers t
  JOIN email_campaigns ec
    ON ec.id = t.campaign
  JOIN email_campaigns_recipients ecr
    ON ecr.campaign = ec.id
  WHERE
    t.id in (SELECT scheduled_after FROM problematic_triggers)
)
INSERT
  INTO email_campaigns_recipients
    (campaign, tag, list, contact, email, brand, send_type, recipient_type, agent)
SELECT
  (campaign, tag, list, contact, email, brand, send_type, recipient_type, agent)
