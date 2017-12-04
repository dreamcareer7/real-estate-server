INSERT INTO brokerwolf_agents (id, object) VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE SET
object = $2
WHERE brokerwolf_agents.id = $1