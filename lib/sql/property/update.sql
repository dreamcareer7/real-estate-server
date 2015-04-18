UPDATE properties
SET property_type = $1,
    property_subtype = $2,
    bedroom_count = $3,
    bathroom_count = $4,
    description = $5,
    square_meters = $6,
    lot_square_meters = $7,
    year_built = $8,
    parking_spaces = $9,
    accessibility_features = $10,
    bedroom_bathroom_features = $11,
    commercial_features = $12,
    community_features = $13,
    energysaving_features = $14,
    exterior_features = $15,
    interior_features = $16,
    farmranch_features = $17,
    fireplace_features = $18,
    lot_features = $19,
    parking_features = $20,
    pool_features = $21,
    security_features = $22,
    updated_at = NOW()
WHERE id = $23
