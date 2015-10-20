SELECT *,
       'contact' AS type,
       EXTRACT(EPOCH FROM contacts.created_at) AS created_at,
       EXTRACT(EPOCH FROM contacts.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM contacts.deleted_at) AS deleted_at
FROM contacts
WHERE id = $1
