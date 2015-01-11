UPDATE shortlists
SET shortlist_type = $1,
    description = $2,
    owner = $3
WHERE id = $4
