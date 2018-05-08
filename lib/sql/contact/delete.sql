UPDATE contacts
SET deleted_at = now()
WHERE id = ANY($1::uuid[])
