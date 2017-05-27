CREATE OR REPLACE FUNCTION get_brand_agents(id uuid) RETURNS
   setof uuid
AS
$$
  SELECT agents.id FROM agents
  JOIN users ON agents.id = users.agent
  WHERE users.id IN (
    (SELECT "user" FROM brands_users WHERE brand = $1)
  )
  UNION
  SELECT agents.id FROM agents
  WHERE office_mui IN (
    SELECT matrix_unique_id FROM offices
    WHERE id IN (SELECT office FROM brands_offices WHERE brand = $1)
  )
$$
LANGUAGE sql;