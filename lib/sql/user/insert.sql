INSERT INTO users (TYPE, first_name, last_name, password, email, phone_number, agency_id)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7) RETURNING id
