SELECT 'url' AS TYPE,
       cover_image_url AS url
FROM agencies
WHERE id = $1
