INSERT INTO brands (name, parent, palette, assets, messages) VALUES ($1, $2::uuid, $3::jsonb, $4::jsonb, $5::jsonb)
RETURNING id