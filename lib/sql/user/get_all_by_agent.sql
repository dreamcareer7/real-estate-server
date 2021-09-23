-- $1: Agent ID

SELECT
  id
FROM
  users_agents AS ua
WHERE
  ua.agent = $1::uuid
