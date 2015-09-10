SELECT (shortlists_users.push_enabled AND (NOT shortlists.archived)) AS ok
FROM shortlists_users
INNER JOIN shortlists
    ON shortlists_users.shortlist = shortlists.id
WHERE shortlist_users."user" = $1 AND
      shortlist_users.shortlist = $2
