SELECT
  nn.*
FROM
  new_notifications AS nn
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = nn.id
