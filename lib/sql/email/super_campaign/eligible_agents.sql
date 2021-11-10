SELECT DISTINCT
  ba.*
FROM
  unnest($1::uuid[]) AS bid
  CROSS JOIN get_brand_agents(bid) AS ba
  JOIN users AS u ON u.id = ba.user
ORDER BY u.is_shadow DESC, u.first_name, u.last_name
