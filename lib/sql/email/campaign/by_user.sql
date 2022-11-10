SELECT id FROM email_campaigns
WHERE created_by = $1
AND   (due_at >= $2 OR $2 IS NULL)
AND   (due_at <= $3 OR $3 IS NULL)
AND   deleted_at IS NULL
LIMIT $4
