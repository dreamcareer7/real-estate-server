INSERT INTO
  crm_tags (
    brand,
    created_by,
    created_within,
    tag
  )
SELECT
  $1::uuid,
  $2::uuid,
  $3::text,
  ca.text AS tag
FROM
  contacts_attributes AS ca
  JOIN contacts AS c
    ON c.id = ca.contact
WHERE
  c.deleted_at IS NULL
  AND ca.deleted_at IS NULL
  AND c.brand = $1::uuid
  AND ca.attribute_type = 'tag'
ON CONFLICT DO NOTHING
RETURNING
  *
