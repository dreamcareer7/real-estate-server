SELECT id FROM brands_emails WHERE brand IS NULL OR brand = $1 AND deleted_at IS NULL
