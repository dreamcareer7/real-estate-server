UPDATE users
SET first_name = $1,
    last_name = $2,
    email = $3,
    phone_number = $4,
    profile_image_url = $5,
    profile_image_thumbnail_url = $6,
    cover_image_url = $7,
    cover_image_thumbnail_url = $8
WHERE id = $9
