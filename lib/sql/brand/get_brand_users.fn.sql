CREATE OR REPLACE FUNCTION get_brand_users(uuid, uuid) RETURNS
   setof uuid
AS
$$
  WITH brand_users AS (
    SELECT DISTINCT users.id FROM users
      LEFT JOIN agents         ON users.agent = agents.id
      LEFT JOIN offices        ON agents.office_mui = offices.matrix_unique_id
      LEFT JOIN brands_offices ON offices.id = brands_offices.office
      LEFT JOIN brands_agents  ON agents.id = brands_agents.agent
      LEFT JOIN brands_users   ON users.id = brands_users.user
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
  )

  SELECT (
    CASE WHEN $2 IS NULL THEN
      (
        SELECT * FROM brand_users
      )
    ELSE
      (
        SELECT * FROM brand_users
      )
    END
  )
$$
LANGUAGE sql;