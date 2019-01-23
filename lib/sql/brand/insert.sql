INSERT INTO brands (name, parent, brand_type, palette, assets, messages)
VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::jsonb)
RETURNING id
