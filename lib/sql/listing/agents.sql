SELECT
  users.id
FROM  listings
JOIN agents ON listings.mls = agents.mls
  AND (listings.list_agent_mui = agents.matrix_unique_id OR listings.co_list_agent_mui = agents.matrix_unique_id)
JOIN users ON agents.id = users.agent
WHERE listings.id = $1
AND users.deleted_at IS NULL
AND agents.deleted_at IS NULL
AND agents.status = 'Active'
