UPDATE shortlists_users
SET push_enabled = $3
WHERE "user" = $1 AND
      shortlist = $2
