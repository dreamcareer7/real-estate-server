SELECT id FROM email_campaign_emails WHERE campaign = $1 AND LOWER(email_address) = LOWER($2)
