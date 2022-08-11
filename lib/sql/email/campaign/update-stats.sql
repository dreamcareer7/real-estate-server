SELECT *, update_email_campaign_stats(id, $2) FROM email_campaigns WHERE id = $1::uuid
