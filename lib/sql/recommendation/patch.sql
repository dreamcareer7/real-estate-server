UPDATE recommendations
SET favorited = $2,
    updated_at = CASE WHEN $2 = TRUE THEN NOW() ELSE updated_at END
WHERE id = $1
