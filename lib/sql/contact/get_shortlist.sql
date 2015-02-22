SELECT shortlists_users."user" AS contact_id
FROM shortlists_users
INNER JOIN users ON shortlists_users."user" = users.id
WHERE shortlists_users.shortlist IN (
    SELECT shortlist
    FROM shortlists_users
    WHERE "user" = $1
    )
AND shortlists_users."user" <> $1
AND shortlists_users."user" = users.id
AND CASE
    WHEN $2 = 'Since' THEN uuid_timestamp(id) > uuid_timestamp($3)
    WHEN $2 = 'Max' THEN uuid_timestamp(id) < uuid_timestamp($3)
    ELSE TRUE
    END
ORDER BY
    CASE WHEN $4 THEN created_at END,
    CASE WHEN NOT $4 THEN created_at END DESC
LIMIT $5;
