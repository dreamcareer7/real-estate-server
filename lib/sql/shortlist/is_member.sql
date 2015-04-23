SELECT (
    SELECT COUNT(*)
    FROM shortlists_users
    WHERE shortlist = $1 AND
    "user" = $2
    )::INT AS is_member;
