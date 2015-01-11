INSERT INTO agencies (name, phone_number, address)
VALUES ($1,
        $2,
        $3) RETURNING id
