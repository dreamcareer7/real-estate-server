SELECT id FROM deal_context
WHERE deal = $1 AND key = $2
ORDER BY created_at DESC