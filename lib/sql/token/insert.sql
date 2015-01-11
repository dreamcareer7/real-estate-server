INSERT INTO tokens (token, client_id, user_id, type, expire_date)
VALUES ($1,
        $2,
        $3,
        $4,
        to_timestamp($5))
