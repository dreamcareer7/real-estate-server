INSERT INTO users (first_name, last_name, password, email, phone_number, user_type)
VALUES ($1,
        $2,
        $3,
        LOWER($4),
        $5,
        $6) RETURNING id
