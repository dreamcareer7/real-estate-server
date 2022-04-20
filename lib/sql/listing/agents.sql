SELECT
  users.id as user,
  ARRAY_REMOVE(ARRAY_AGG(listing_notification_subscriptions.email), NULL) as subscriptions
FROM  listings
JOIN agents ON listings.mls = agents.mls
  AND (listings.list_agent_mui = agents.matrix_unique_id OR listings.co_list_agent_mui = agents.matrix_unique_id)
JOIN users_agents ON agents.id = users_agents.agent
JOIN users ON users.id = users_agents.user
LEFT JOIN listing_notification_subscriptions ON users.id = listing_notification_subscriptions.user
          AND listing_notification_subscriptions.types @> ARRAY[$2]::listing_notification_subscription[]
WHERE listings.id = $1
AND users.deleted_at IS NULL
AND agents.deleted_at IS NULL
AND agents.status = 'Active'
GROUP BY users.id
