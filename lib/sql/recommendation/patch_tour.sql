UPDATE recommendations
SET toured = $2,
    updated_at = CASE WHEN $2 = TRUE THEN NOW() ELSE updated_at END,
    read = TRUE
WHERE id = $1
