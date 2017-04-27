WITH c AS (
  SELECT id,
         refs,
         (COUNT(*) OVER())::INT AS total,
         created_at,
         COALESCE
         (
           (
             SELECT MAX(updated_at)
             FROM activities
             WHERE reference = id OR
                   reference IN
                   (
                     SELECT id
                     FROM users
                     WHERE email IN
                     (
                       SELECT DISTINCT(email)
                       FROM contacts_emails
                       WHERE contact = ANY(refs) AND
                             deleted_at IS NULL
                     )
                     UNION
                     SELECT id
                     FROM users
                     WHERE phone_number IN
                     (
                       SELECT DISTINCT(phone_number)
                       FROM contacts_phone_numbers
                       WHERE contact = ANY(refs) AND
                             deleted_at IS NULL
                     )
                   )
           ), updated_at
         ) AS updated_at
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
LIMIT $4;
