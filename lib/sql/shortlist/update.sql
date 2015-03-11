UPDATE shortlists
SET shortlist_type = $1,
    title = $2,
    owner = $3,
    status = $4
WHERE id = $5
