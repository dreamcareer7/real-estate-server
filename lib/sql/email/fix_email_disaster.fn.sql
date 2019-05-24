CREATE FUNCTION fix_email_disaster(campaign uuid) RETURNS void LANGUAGE SQL AS $$
  WITH mistaken_emails AS (
    SELECT
      ee.id
    FROM
      email_campaign_emails AS ee
      JOIN contacts AS c
        ON ee.contact = c.id
      JOIN email_campaigns AS e
        ON ee.campaign = e.id
    WHERE
      e.id = $1
      AND c.brand <> e.brand
  ), delete_ee AS (
    DELETE FROM
      email_campaign_emails AS ee
    WHERE
      ee.id = ANY(SELECT id FROM mistaken_emails)
    RETURNING ee.email
  )
  UPDATE
    emails
  SET
    campaign = NULL
  FROM
    delete_ee AS de
  WHERE
    emails.id = de.email;
  
  WITH ev AS (
    SELECT
      SUM(accepted) AS accepted,
      SUM(rejected) AS rejected,
      SUM(delivered) AS delivered,
      SUM(failed) AS failed,
      SUM(opened) AS opened,
      SUM(clicked) AS clicked,
      SUM(unsubscribed) AS unsubscribed,
      SUM(complained) AS complained,
      SUM(stored) AS stored
    FROM
      emails
    WHERE
      campaign = $1
  )
  UPDATE
    email_campaigns AS e
  SET
    accepted = ev.accepted
    rejected = ev.rejected
    delivered = ev.delivered
    failed = ev.failed
    opened = ev.opened
    clicked = ev.clicked
    unsubscribed = ev.unsubscribed
    complained = ev.complained
    stored = ev.stored
  FROM
    ev
  WHERE
    e.id = $1;
$$;
