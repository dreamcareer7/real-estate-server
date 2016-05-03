  INSERT INTO google_tokens("user",
    access_token,
    refresh_token,
    expiry_date)
VALUES ($1,
        $2,
        $3,
        $4)
ON CONFLICT ("user") DO NOTHING
RETURNING id
