SELECT id FROM email_campaigns
WHERE
brand = $1::uuid
AND deleted_at IS NULL
AND (CASE WHEN $2::boolean IS NULL THEN TRUE
          WHEN $2::boolean THEN due_at IS NOT NULL
          WHEN NOT $2::boolean THEN due_at IS NULL END)
ORDER BY created_at DESC
LIMIT $3
