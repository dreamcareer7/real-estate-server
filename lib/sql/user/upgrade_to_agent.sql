UPDATE users
SET agent = $2,
    user_type = 'Agent',
    updated_at = now(),
    daily_enabled = TRUE
WHERE id = $1
