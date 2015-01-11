SELECT 'shortlist' AS TYPE,
       shortlists.*
FROM shortlists
WHERE id = $1
