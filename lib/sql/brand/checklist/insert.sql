INSERT INTO brands_checklists (brand, title, deal_type, property_type, "order") VALUES ($1, $2, $3, $4, $5)
RETURNING id