INSERT INTO brands_checklists
    (brand, title, deal_type, property_type, "order", is_terminatable, tab_name) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id