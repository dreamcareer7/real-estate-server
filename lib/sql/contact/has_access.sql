SELECT
  id,
  check_contact_read_access(contacts, $2) AS "read",
  check_contact_write_access(contacts, $2) AS "write"
FROM
  contacts
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON contacts.id = did
WHERE
  deleted_at IS NULL