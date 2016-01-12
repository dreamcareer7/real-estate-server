INSERT INTO attachments(
    "user",
    url,
    metadata
)
VALUES ($1, $2, $3)
RETURNING id
