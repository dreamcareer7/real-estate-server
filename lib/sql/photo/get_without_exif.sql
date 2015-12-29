SELECT id, matrix_unique_id, url FROM photos
WHERE url IS NOT NULL AND exif IS NULL
ORDER BY id DESC
LIMIT $1