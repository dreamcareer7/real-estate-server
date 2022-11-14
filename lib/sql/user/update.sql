UPDATE users
SET first_name = $1,
    last_name = $2,
    email = LOWER(TRIM($3)),
    phone_number = $4,
    profile_image_url = $5,
    cover_image_url = $6,
    brand = $7,
    updated_at = CLOCK_TIMESTAMP(),
    fake_email = CASE WHEN email IS DISTINCT FROM $3 THEN false ELSE fake_email END,
    is_shadow = $8,
    email_signature = $9,
    daily_enabled = $10,
    website = $11,
    instagram = $12,
    twitter = $13,
    linkedin = $14,
    youtube = $15,
    facebook = $16,
    tiktok = $17,
    designation = $18

WHERE id = $19
