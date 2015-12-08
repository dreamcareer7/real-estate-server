UPDATE users
SET profile_image_url = CASE WHEN $2 = 'Profile' THEN $3 ELSE profile_image_url END,
    cover_image_url = CASE WHEN $2 = 'Cover' THEN $3 ELSE cover_image_url END
WHERE id = $1
