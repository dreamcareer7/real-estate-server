SELECT *, update_email_campaign_stats(id) FROM email_campaigns WHERE id = $1::uuid
