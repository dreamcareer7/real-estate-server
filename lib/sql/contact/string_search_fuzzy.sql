WITH r AS (
  SELECT contacts.id AS id,
         (
           COALESCE(SIMILARITY(contacts.email, $2), 0) +
           COALESCE(SIMILARITY(contacts.first_name, $2), 0) +
           COALESCE(SIMILARITY(contacts.last_name, $2), 0) +
           COALESCE(SIMILARITY(contacts.phone_number, $2), 0) +
           COALESCE(SIMILARITY(contacts.company, $2), 0) +
           COALESCE(SIMILARITY(users.email, $2), 0) +
           COALESCE(SIMILARITY(users.first_name, $2), 0) +
           COALESCE(SIMILARITY(users.last_name, $2), 0) +
           COALESCE(SIMILARITY(users.phone_number, $2), 0)
         ) / 9.0 AS sim
  FROM contacts
  LEFT JOIN users
    ON contacts.contact_user = users.id
  WHERE contacts."user" = $1 AND
        contacts.deleted_at IS NULL AND
        CASE WHEN $5 IS TRUE THEN TRUE ELSE contacts.contact_user IS NOT NULL END
  ORDER BY contacts.first_name,
           contacts.last_name,
           contacts.email,
           contacts.phone_number
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM r
WHERE sim >= $4
LIMIT $3
