SELECT id FROM email_campaigns
WHERE
brand = $1::uuid
AND deleted_at IS NULL
ORDER BY created_at DESC
