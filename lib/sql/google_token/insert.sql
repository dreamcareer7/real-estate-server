INSERT INTO google_tokens("user",
    access_token,
    refresh_token,
    expiry_date,
    calendar_id)
VALUES ($1,
        $2,
        $3,
        $4,
        $5)
ON CONFLICT ("user") DO NOTHING
RETURNING id
