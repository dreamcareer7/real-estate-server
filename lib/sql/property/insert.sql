INSERT INTO
    properties(property_type,
               bedroom_count,
               bathroom_count,
               description,
               square_meters)
VALUES ($1,
        $2,
        $3,
        $4,
        $5) RETURNING id
