INSERT INTO photos(
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order")
VALUES ($1,
        $2,
        $3,
        $4,
        $5)
ON CONFLICT DO NOTHING
RETURNING id