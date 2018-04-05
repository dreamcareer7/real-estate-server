SELECT
  cattrs.id as id,
  'tag' as "type",
  cattrs.text AS tag,
  EXTRACT(EPOCH FROM cattrs.created_at) AS created_at,
  EXTRACT(EPOCH FROM cattrs.updated_at) AS updated_at
FROM
  contacts
  INNER JOIN contacts_attributes_with_name AS cattrs
    ON contacts.id = cattrs.contact
WHERE
  contacts.deleted_at IS NULL
  AND check_contact_read_access(contacts, $1)
  AND cattrs.name = 'tag';
