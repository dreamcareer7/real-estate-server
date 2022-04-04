UPDATE
    social_posts
SET
    executed_at = NOW()
WHERE
    id = $1
