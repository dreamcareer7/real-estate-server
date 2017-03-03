UPDATE contacts
SET refs = $2::uuid[]
WHERE id = $1
