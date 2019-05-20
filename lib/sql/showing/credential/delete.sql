UPDATE showings_credentials SET deleted_at = CLOCK_TIMESTAMP() WHERE "user" = $1 AND brand = $2
