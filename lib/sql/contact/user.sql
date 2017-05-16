with crefs AS (
  SELECT DISTINCT(UNNEST(refs)) AS id
  FROM contacts
  WHERE "user" = $1 AND
        contacts.deleted_at IS NULL AND
        contacts.merged IS FALSE
),
p AS (
  SELECT crefs.id AS contact,
         contacts_emails.email AS email,
         contacts_phone_numbers.phone_number AS phone_number,
         users.id AS "user"
  FROM crefs
  LEFT JOIN contacts_emails ON
    crefs.id = contacts_emails.contact
  LEFT JOIN contacts_phone_numbers ON
    crefs.id = contacts_phone_numbers.contact
  LEFT JOIN users ON
    users.phone_number = contacts_phone_numbers.phone_number OR
    users.email = contacts_emails.email
  WHERE contacts_emails.deleted_at IS NULL AND
        contacts_phone_numbers.deleted_at IS NULL
),
a AS (
  SELECT activities.reference,
         MAX(activities.created_at) as updated_at
  FROM p
  INNER JOIN activities ON (
    activities.reference = p.contact OR
    activities.reference = p.user
  )
  GROUP BY activities.reference
),
c AS (
  SELECT id,
         refs,
         (COUNT(*) OVER())::INT AS total,
         created_at,
         COALESCE(
           (SELECT a.updated_at FROM a WHERE a.reference = contacts.id),
           contacts.updated_at
         ) as updated_at
  FROM contacts
  WHERE "user" = $1 AND
  deleted_at IS NULL
)

SELECT id,
       total
FROM c
WHERE CASE
    WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    ELSE TRUE
    END
ORDER BY
    CASE $2
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $4
