SELECT
    id
FROM 
    showings_credentials
WHERE 
    (
        last_crawled_at >= (NOW() - '2 hours'::interval)
        OR
        last_crawled_at IS NULL
    )
    AND deleted_at IS NULL
