SELECT
  DISTINCT users.id
FROM  listings
JOIN agents ON listings.mls = agents.mls
  AND (listings.list_agent_mui = agents.matrix_unique_id OR listings.co_list_agent_mui = agents.matrix_unique_id)
JOIN users_agents ON agents.id = users_agents.agent
JOIN users ON users.id = users_agents.user
WHERE listings.id = $1
AND users.deleted_at IS NULL
AND agents.deleted_at IS NULL
AND agents.status = 'Active'

AND users.daily_enabled IS TRUE -- This is temporary and must be removed later.
                                -- Once DE California is onboarded, this condition can be removed
