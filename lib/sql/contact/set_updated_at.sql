UPDATE contacts
SET updated_at = NOW()
WHERE id = ANY($1::uuid[])