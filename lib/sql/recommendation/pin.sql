UPDATE recommendations
SET status = 'Pinned',
    favorited = TRUE
WHERE id = $1
