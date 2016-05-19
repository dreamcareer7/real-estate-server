UPDATE users
SET agent = $2,
    user_type = 'Agent'
WHERE id = $1
