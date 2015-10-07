SELECT (
    SELECT COUNT(*)
    FROM rooms_users
    WHERE room = $1 AND
    "user" = $2 AND
    deleted_at IS NULL
    )::INT AS is_member;
