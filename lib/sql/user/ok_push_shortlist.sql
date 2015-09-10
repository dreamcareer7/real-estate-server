SELECT push_enabled AS ok
FROM shortlists_users
WHERE "user" = $1 AND
      shortlist = $2
