SELECT 'url' AS TYPE,
       profile_image_url AS url
FROM agencies
WHERE id = $1
