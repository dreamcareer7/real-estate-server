INSERT INTO attachments(
    "user",
    url,
    metadata,
    info
)
VALUES ($1, $2, $3, $4)
RETURNING id
