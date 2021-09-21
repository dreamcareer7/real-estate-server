WITH add AS (
    INSERT INTO users_agents ("user", agent) VALUES ($1, $2) ON CONFLICT DO NOTHING
)

UPDATE users
SET 
    user_type = 'Agent',
    updated_at = now(),
    daily_enabled = TRUE
WHERE id = $1
