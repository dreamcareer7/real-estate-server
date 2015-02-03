SELECT "user"
FROM shortlists_users
WHERE shortlist = $1
AND "user" <> $2
