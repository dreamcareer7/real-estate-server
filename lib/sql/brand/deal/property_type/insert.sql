INSERT INTO brands_property_types
(brand, label, is_lease)
VALUES
($1, $2, $3)
RETURNING id
