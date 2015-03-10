UPDATE shortlists
SET shortlist_type = $1,
    description = $2,
    owner = $3,
    status = $4
WHERE id = $5
