SELECT listings.id
FROM addresses
INNER JOIN listings
    ON addresses.matrix_unique_id = listings.matrix_unique_id
WHERE addresses.id = $1
