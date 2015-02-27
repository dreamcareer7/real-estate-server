SELECT 'shortlist' AS TYPE,
       shortlists.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM shortlists
WHERE id = $1
