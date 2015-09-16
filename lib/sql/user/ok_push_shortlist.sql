SELECT (shortlists_users.push_enabled AND (NOT shortlists.archived)) AS ok
FROM shortlists_users
INNER JOIN shortlists
    ON shortlists_users.shortlist = shortlists.id
WHERE shortlists_users."user" = $1 AND
      shortlists_users.shortlist = $2
