CREATE OR REPLACE FUNCTION get_brand_agents(id uuid) RETURNS
   setof uuid
AS
$$
  SELECT DISTINCT agents.id AS id FROM agents
    FULL JOIN users          ON agents.id = users.agent
    FULL JOIN offices        ON agents.office_mui = offices.matrix_unique_id
    FULL JOIN brands_offices ON offices.id = brands_offices.office
    FULL JOIN brands_agents  ON agents.id = brands_agents.agent
    FULL JOIN brands_users   ON users.id = brands_users.user
  WHERE (
    (
      brands_offices.brand = $1
    )
    OR
    (
      brands_agents.brand = $1
    )
    OR
    (
      brands_users.brand = $1
    )
  )
$$
LANGUAGE sql;