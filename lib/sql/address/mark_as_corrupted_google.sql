UPDATE addresses
SET corrupted_google = TRUE
WHERE id = $1
