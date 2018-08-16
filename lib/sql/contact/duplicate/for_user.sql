SELECT
  cluster AS id,
  array_agg(contact) AS contacts,
  'contact_duplicate' AS "type",
  COUNT(*) OVER()::INT AS total
FROM
  contacts_duplicate_clusters
  JOIN contacts
    ON contact = contacts.id
WHERE
  check_contact_read_access(contacts.*, $1::uuid)
  AND deleted_at IS NULL
GROUP BY
  cluster
OFFSET $2
LIMIT $3