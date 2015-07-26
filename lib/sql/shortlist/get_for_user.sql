SELECT 'shortlist' AS TYPE,
       shortlist AS id
FROM shortlists_users
WHERE shortlists_users."user" = $1
