UPDATE users
SET first_name = $1,
    last_name = $2,
    email = LOWER($3),
    phone_number = $4,
    profile_image_url = $5,
    cover_image_url = $6,
    user_type = $7,
    updated_at = NOW()
WHERE id = $8
