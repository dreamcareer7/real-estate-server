INSERT INTO users (first_name, last_name, password, email, phone_number, user_type, agent)
VALUES ($1,
        $2,
        $3,
        LOWER($4),
        $5,
        $6,
        $7) RETURNING id
