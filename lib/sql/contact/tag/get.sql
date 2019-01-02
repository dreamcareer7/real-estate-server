WITH uc AS (
  SELECT
    id
  FROM
    contacts
  WHERE
    check_contact_read_access(contacts, $1)
    AND (CASE
      WHEN $2::uuid[] IS NOT NULL THEN
        contacts."user" = ANY($2::uuid[])
      ELSE
        TRUE
    END)
    AND deleted_at IS NULL
)
SELECT DISTINCT ON (text)
  cattrs.id,
  'contact_attribute' as "type",
  'tag' as "attribute_type",
  text,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM
  contacts_attributes AS cattrs
  JOIN uc ON cattrs.contact = uc.id
WHERE
  attribute_type = 'tag'
ORDER BY
  text;
