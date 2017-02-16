UPDATE users
SET first_name = $1,
    last_name = $2,
    email = LOWER($3),
    phone_number = $4,
    profile_image_url = $5,
    cover_image_url = $6,
    brand = $7,
    updated_at = CLOCK_TIMESTAMP(),
    is_shadow = CASE WHEN ($8::boolean IS NULL OR $8::boolean IS FALSE) THEN FALSE ELSE TRUE END,
    fake_email = FALSE
WHERE id = $9
