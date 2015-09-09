INSERT INTO users (first_name, last_name, password, email, phone_number, agency_id, user_code)
VALUES ($1,
        $2,
        $3,
        LOWER($4),
        $5,
        $6,
        $7) RETURNING id
