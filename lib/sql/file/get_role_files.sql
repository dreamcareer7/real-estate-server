SELECT
    id
FROM
    role_files
WHERE
    "role" = $1
    AND role_id = $2
