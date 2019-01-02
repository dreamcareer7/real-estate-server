SELECT DISTINCT ON (cattrs.text)
  cattrs.id,
  'contact_attribute' as "type",
  'tag' as "attribute_type",
  cattrs.text,
  EXTRACT(EPOCH FROM cattrs.created_at) AS created_at,
  EXTRACT(EPOCH FROM cattrs.updated_at) AS updated_at
FROM
  contacts
  JOIN contacts_attributes AS cattrs
    ON contacts.id = cattrs.contact
WHERE
  check_contact_read_access(contacts, $1)
  AND (CASE
    WHEN $2::uuid[] IS NOT NULL THEN
      contacts."user" = ANY($2::uuid[])
    ELSE
      TRUE
  END)
  AND cattrs.attribute_type = 'tag'
ORDER BY
  cattrs.text
