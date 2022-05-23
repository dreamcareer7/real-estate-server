SELECT
  count(*)::INT
FROM
  email_campaign_emails AS ece
  JOIN email_campaigns AS ec
    ON ec.id = ece.campaign
WHERE
  ec.from = $1::uuid
  AND ec.individual IS TRUE
  AND executed_at BETWEEN date_trunc('month', now()) and now()
