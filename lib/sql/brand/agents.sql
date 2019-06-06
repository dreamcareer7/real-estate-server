SELECT
  ba.*
FROM    get_brand_agents($1) ba
JOIN    users                 ON ba.user = users.id
ORDER BY users.is_shadow DESC, users.first_name, users.last_name
