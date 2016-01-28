INSERT INTO attachments(
    "user",
    url,
    metadata,
    info,
    attributes,
    private
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
