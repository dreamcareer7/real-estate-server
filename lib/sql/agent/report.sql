WITH listed_listings AS (                               /* These are listings which have been listed which match our criteria */
  SELECT list_agent_mls_id, original_price, status FROM listings WHERE
    CASE WHEN $1::text IS NULL THEN TRUE ELSE mls_area_major = $1 END AND
    CASE WHEN $2::text IS NULL THEN TRUE ELSE mls_area_minor = $2 END AND
    CASE WHEN $3::timestamptz IS NULL THEN TRUE ELSE list_date >= $3 END AND
    CASE WHEN $4::timestamptz IS NULL THEN TRUE ELSE list_date <= $4 END

), sold_listings AS (                                   /* These are listings which have been sold which match our criteria */
  SELECT selling_agent_mls_id, close_price FROM listings WHERE
    status = 'Sold' AND
    CASE WHEN $1::text IS NULL THEN TRUE ELSE mls_area_major = $1 END AND
    CASE WHEN $2::text IS NULL THEN TRUE ELSE mls_area_minor = $2 END AND
    CASE WHEN $3::timestamptz IS NULL THEN TRUE ELSE list_date >= $3 END AND
    CASE WHEN $4::timestamptz IS NULL THEN TRUE ELSE list_date <= $4 END

), all_agents AS (                                      /* These are agents which match our listing criteria */
  SELECT agent FROM (
    SELECT DISTINCT list_agent_mls_id AS agent FROM listed_listings
    UNION
    SELECT DISTINCT selling_agent_mls_id AS agent FROM sold_listings
  ) combined_agents
  WHERE agent IS NOT NULL

), listed_volumes AS (                                  /* Count number of listings by each agent */
  SELECT count(*) as listed_volume, list_agent_mls_id FROM listed_listings GROUP BY list_agent_mls_id

), listed_values AS (                                   /* Sum total value of listings by each agent */
  SELECT sum(original_price) as listed_value, list_agent_mls_id FROM listed_listings GROUP BY list_agent_mls_id

), selling_volumes AS (                                 /* Count number of sold listings by each agent */
  SELECT count(*) as selling_volume, selling_agent_mls_id FROM sold_listings GROUP BY selling_agent_mls_id

), selling_values AS (                                  /* Sum total value of sold listings by each agent */
  SELECT sum(close_price) as selling_value, selling_agent_mls_id FROM sold_listings GROUP BY selling_agent_mls_id

), active_volumes AS (
  SELECT count(*) as active_volume, list_agent_mls_id FROM listed_listings
  WHERE status = 'Active'
  GROUP BY list_agent_mls_id

), active_values AS (
  SELECT sum(original_price) as active_value, list_agent_mls_id FROM listed_listings
  WHERE status = 'Active'
  GROUP BY list_agent_mls_id

), total_active_volumes AS (
  SELECT count(*) as total_active_volume, list_agent_mls_id FROM listings
  WHERE status = 'Active' AND
  list_agent_mls_id IN(SELECT agent FROM all_agents)
  GROUP BY list_agent_mls_id

), total_active_values AS (
  SELECT sum(original_price) as total_active_value, list_agent_mls_id FROM listings
  WHERE status = 'Active' AND
  list_agent_mls_id IN(SELECT agent FROM all_agents)
  GROUP BY list_agent_mls_id
)

SELECT
  all_agents.agent,
  listed_volumes.listed_volume,
  listed_values.listed_value,
  selling_volumes.selling_volume,
  selling_values.selling_value,
  active_volumes.active_volume,
  active_values.active_value,
  total_active_volumes.total_active_volume,
  total_active_values.total_active_value
FROM all_agents
  LEFT JOIN listed_volumes ON all_agents.agent = listed_volumes.list_agent_mls_id
  LEFT JOIN listed_values  ON all_agents.agent = listed_values.list_agent_mls_id
  LEFT JOIN selling_volumes ON all_agents.agent = selling_volumes.selling_agent_mls_id
  LEFT JOIN selling_values ON all_agents.agent = selling_values.selling_agent_mls_id
  LEFT JOIN active_volumes ON all_agents.agent = active_volumes.list_agent_mls_id
  LEFT JOIN active_values ON all_agents.agent = active_values.list_agent_mls_id
  LEFT JOIN total_active_volumes ON all_agents.agent = total_active_volumes.list_agent_mls_id
  LEFT JOIN total_active_values ON all_agents.agent = total_active_values.list_agent_mls_id
WHERE
  CASE WHEN $5::integer IS NULL THEN TRUE ELSE listed_volume >= $5 END AND
  CASE WHEN $6::integer IS NULL THEN TRUE ELSE listed_volume <= $6 END AND

  CASE WHEN $7::integer IS NULL THEN TRUE ELSE listed_value >= $7 END AND
  CASE WHEN $8::integer IS NULL THEN TRUE ELSE listed_value <= $8 END AND

  CASE WHEN $9::integer IS NULL THEN TRUE ELSE selling_volume >= $9 END AND
  CASE WHEN $10::integer IS NULL THEN TRUE ELSE selling_volume <= $10 END AND

  CASE WHEN $11::integer IS NULL THEN TRUE ELSE selling_value >= $11 END AND
  CASE WHEN $12::integer IS NULL THEN TRUE ELSE selling_value <= $12 END AND

  CASE WHEN $13::integer IS NULL THEN TRUE ELSE active_volume >= $13 END AND
  CASE WHEN $14::integer IS NULL THEN TRUE ELSE active_volume <= $14 END AND

  CASE WHEN $15::integer IS NULL THEN TRUE ELSE active_value >= $15 END AND
  CASE WHEN $16::integer IS NULL THEN TRUE ELSE active_value <= $16 END AND

  CASE WHEN $17::integer IS NULL THEN TRUE ELSE total_active_volume >= $17 END AND
  CASE WHEN $18::integer IS NULL THEN TRUE ELSE total_active_volume <= $18 END AND

  CASE WHEN $19::integer IS NULL THEN TRUE ELSE total_active_value >= $19 END AND
  CASE WHEN $20::integer IS NULL THEN TRUE ELSE total_active_value <= $20 END