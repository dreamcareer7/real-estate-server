SELECT 'url' AS TYPE,
       cover_image_url AS url
FROM users
WHERE id = $1
