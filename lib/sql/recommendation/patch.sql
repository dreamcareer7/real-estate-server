UPDATE recommendations
SET favorited = $2,
    updated_at = NOW()
WHERE id = $1
