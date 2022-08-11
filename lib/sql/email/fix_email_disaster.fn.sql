CREATE FUNCTION fix_email_disaster(campaign uuid, min_elapsed_time integer) RETURNS void LANGUAGE SQL AS $$
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
  
  SELECT update_email_campaign_stats($1, $2);
$$;
