INSERT INTO brands_checklists (brand, title, flags, "order") VALUES ($1, $2, $3, $4)
RETURNING id