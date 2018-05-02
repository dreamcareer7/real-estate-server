UPDATE users
SET agent = $2,
    user_type = 'Agent',
    updated_at = now()
WHERE id = $1
