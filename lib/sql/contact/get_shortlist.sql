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
    WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Init_C' THEN created_at < NOW()
    WHEN $2 = 'Init_U' THEN updated_at < NOW()
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
