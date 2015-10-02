SELECT (
    SELECT COUNT(*)
    FROM rooms_users
    WHERE room = $1 AND
    "user" = $2
    )::INT AS is_member;
