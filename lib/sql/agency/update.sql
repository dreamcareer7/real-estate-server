UPDATE agencies
SET name = $1,
    phone_number = $2,
    address = $3
WHERE id = $4
