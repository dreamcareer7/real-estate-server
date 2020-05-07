INSERT INTO brands_deal_statuses
(brand, label, deal_types, property_types, color, admin_only, is_archived, is_active, is_pending)
VALUES
($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id
