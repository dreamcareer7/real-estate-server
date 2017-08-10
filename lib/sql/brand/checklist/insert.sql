INSERT INTO brands_checklists (brand, title, listing_type, contract_type, "order") VALUES ($1, $2, $3, $4, $5)
RETURNING id