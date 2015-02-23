INSERT INTO alerts(
        currency,
        minimum_price,
        maximum_price,
        min_bedrooms,
        min_bathrooms,
        minimum_square_meters,
        maximum_square_meters,
        created_by,
        shortlist,
        location,
        title
    )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12) RETURNING id;
