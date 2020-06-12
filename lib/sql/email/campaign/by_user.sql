SELECT id FROM email_campaigns
WHERE created_by = $1 AND created_at > $2 AND deleted_at IS NULL
