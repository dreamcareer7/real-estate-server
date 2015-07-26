SELECT id
FROM invitation_records
WHERE invited_user = $1 AND
     CASE WHEN $2 = 'Shortlist' THEN (resource IS NOT NULL)
     ELSE TRUE
     END
