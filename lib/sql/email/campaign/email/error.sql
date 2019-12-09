UPDATE
  email_campaign_emails
SET
  error = $2
WHERE
  email = $1