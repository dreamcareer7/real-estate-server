SELECT
  id
FROM
  contacts_attributes
WHERE
  contact = ANY($1::uuid[])
  AND (CASE WHEN $2::uuid[] IS NULL THEN TRUE ELSE attribute_def = ANY($2::uuid[]) END)
ORDER BY contact, created_at
