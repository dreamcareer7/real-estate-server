UPDATE email_campaigns SET executed_at = NOW()
WHERE id = $1
