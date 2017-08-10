INSERT INTO brands_checklists (brand, title, deal_type, contract_type, "order") VALUES ($1, $2, $3, $4, $5)
RETURNING id