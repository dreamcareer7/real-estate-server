INSERT INTO phone_verifications(code, phone_number)
    VALUES ($1, $2)
ON CONFLICT (phone_number) DO UPDATE
    SET code = $1
    WHERE phone_verifications.phone_number = $2
RETURNING id
