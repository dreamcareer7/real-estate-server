SELECT 'url' AS TYPE,
       profile_image_url AS url
FROM users
WHERE id = $1
