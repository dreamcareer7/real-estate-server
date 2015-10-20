UPDATE contacts
SET contact = $1,
    first_name = $2,
    last_name = $3,
    phone_number = $4,
    email = $5,
    updated_at = NOW()
WHERE id = $6
