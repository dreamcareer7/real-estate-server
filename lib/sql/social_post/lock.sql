SELECT
    id,
    executed_at
FROM
    social_posts
WHERE
    id = $1
FOR UPDATE
    SKIP LOCKED
