INSERT INTO
  forms (formstack_id, name, fields) VALUES ($1, $2, $3)
RETURNING id
