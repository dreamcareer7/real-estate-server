SELECT
    (COUNT(*) OVER())::INT AS full_count,
    shortlists_users."user" AS contact_id
FROM shortlists_users
INNER JOIN users ON shortlists_users."user" = users.id
WHERE shortlists_users.shortlist IN (
    SELECT shortlist
    FROM shortlists_users
    WHERE "user" = $1
    )
AND shortlists_users."user" <> $1
AND shortlists_users."user" = users.id
ORDER BY users.last_name ASC
LIMIT $2
OFFSET $3
