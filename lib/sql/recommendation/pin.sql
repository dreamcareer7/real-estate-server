UPDATE recommendations
SET status = 'Pinned',
    favorited = TRUE,
    updated_at = NOW()
WHERE id = $1
