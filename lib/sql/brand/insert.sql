INSERT INTO brands (parent, palette, assets, messages) VALUES ($1::uuid, $2::jsonb, $3::jsonb, $4::jsonb)
RETURNING id