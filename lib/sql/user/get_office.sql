SELECT offices.*
FROM users
  INNER JOIN agents
    ON users.agent = agents.id
  INNER JOIN offices
    ON (
      agents.office_mui = offices.office_mui OR
      agents.office_mlsid = offices.office_mls_id
    )
  WHERE users.id = $1
  LIMIT 1
