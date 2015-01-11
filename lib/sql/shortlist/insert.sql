INSERT INTO shortlists (shortlist_type, description, OWNER)
VALUES ($1,
        $2,
        $3) RETURNING id
