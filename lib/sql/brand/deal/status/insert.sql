INSERT INTO brands_deal_statuses
(brand, label, deal_types, property_types, color, admin_only)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id
