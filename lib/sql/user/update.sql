UPDATE users
SET first_name = $1,
    last_name = $2,
    email = LOWER($3),
    phone_number = $4,
    profile_image_url = $5,
    cover_image_url = $6,
    brand = $7,
    updated_at = CLOCK_TIMESTAMP(),
    fake_email = CASE WHEN email <> $3 THEN false ELSE fake_email END,
    is_shadow = $8
WHERE id = $9
