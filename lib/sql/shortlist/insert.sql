INSERT INTO shortlists (shortlist_type, title, OWNER)
VALUES ($1,
        $2,
        $3) RETURNING id
