UPDATE
    social_posts
SET
    due_at = to_timestamp($2),
    updated_at = CLOCK_TIMESTAMP()
WHERE
    id = $1
