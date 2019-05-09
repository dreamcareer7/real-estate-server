SELECT id 
FROM 
    showings_credentials
WHERE 
    last_crawled_at >= (NOW() - '2 hours'::interval)
    AND deleted_at IS NULL
