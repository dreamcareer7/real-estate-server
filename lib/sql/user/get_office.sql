SELECT offices.*
FROM users
  INNER JOIN agents
    ON users.agent = agents.id
  INNER JOIN offices
    ON (
      agents.office_mui = offices.matrix_unique_id
    )
  WHERE users.id = $1
  LIMIT 1
