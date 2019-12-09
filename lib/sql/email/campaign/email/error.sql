UPDATE
  email_campaign_emails
SET
  error = $2
WHERE
  id = $1