INSERT INTO brands_customers
(brand, "user", chargebee_id, chargebee_object, created_within, updated_within)
VALUES
($1, $2, $3, $4, $5, $5)
RETURNING id
