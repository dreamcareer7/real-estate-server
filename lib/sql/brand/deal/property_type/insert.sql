INSERT INTO brands_property_types
(brand, label, is_lease, required_roles, optional_roles)
VALUES
($1, $2, $3, $4, $5)
RETURNING id
