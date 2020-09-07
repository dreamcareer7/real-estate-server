SELECT count(DISTINCT email)
FROM
  email_campaigns_recipient_emails
WHERE                             
  email IS NOT NULL               
  AND campaign = $1