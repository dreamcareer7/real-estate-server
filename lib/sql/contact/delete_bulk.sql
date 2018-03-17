UPDATE contacts
SET deleted_at = CLOCK_TIMESTAMP()
WHERE id = ANY($1::uuid[])