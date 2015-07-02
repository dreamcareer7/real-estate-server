UPDATE recommendations
SET read = TRUE,
    favorited = TRUE
WHERE id = $1
