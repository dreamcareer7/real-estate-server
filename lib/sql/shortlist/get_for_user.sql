SELECT 'shortlist' AS TYPE,
       shortlist AS id
FROM shortlists_users
INNER JOIN shortlists
ON shortlists_users.shortlist = shortlists.id
WHERE shortlists_users."user" = $1 AND
      shortlists.archived IS FALSE
