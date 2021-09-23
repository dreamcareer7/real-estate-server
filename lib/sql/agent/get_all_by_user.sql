-- $1: User ID

SELECT
  id
FROM
  users_agents AS ua
WHERE
  ua.user = $1::uuid
