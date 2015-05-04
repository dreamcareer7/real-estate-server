SELECT users.id
FROM users
INNER JOIN shortlists_users ON users.id = shortlists_users.user
WHERE shortlists_users.shortlist = $1
