INSERT INTO alerts(
        currency,
        minimum_price,
        maximum_price,
        bedroom_type,
        bathroom_type,
        minimum_square_meters,
        maximum_square_meters,
        created_by,
        shortlist
    )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;
