UPDATE users
SET first_name = $1,
    last_name = $2,
    email = LOWER($3),
    phone_number = $4,
    profile_image_url = $5,
    cover_image_url = $6,
    updated_at = NOW(),
    is_shadow = FALSE
WHERE id = $7
