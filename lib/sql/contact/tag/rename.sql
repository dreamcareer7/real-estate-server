UPDATE
  contacts_attributes AS ca
SET
  text = $3
FROM
  contacts AS c
WHERE
  c.brand = $1
  AND ca.contact = c.id
  AND ca.text ILIKE $2
RETURNING
  ca.contact
