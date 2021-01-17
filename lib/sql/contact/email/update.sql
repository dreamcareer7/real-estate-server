WITH d AS (
  DELETE FROM
    contacts_emails
  WHERE
    contact = ANY($1::uuid[])
  RETURNING id
)
INSERT INTO
  contacts_emails (
    id,
    contact,
    label,
    is_primary,
    email,
    is_partner,
    brand
  )
SELECT
  a.id,
  a.contact,
  a.label,
  a.is_primary,
  a.text,
  a.is_partner,
  c.brand
FROM
  contacts_attributes AS a
  JOIN contacts AS c
    ON c.id = a.contact
  LEFT JOIN d
    ON d.id = a.id
WHERE
  c.deleted_at IS NULL
  AND a.deleted_at IS NULL
  AND a.attribute_type = 'email'
  AND contact = ANY($1::uuid[])
