INSERT INTO alerts(
        minimum_price,
        maximum_price,
        minimum_square_meters,
        maximum_square_meters,
        minimum_bedrooms,
        minimum_bathrooms,
        created_by,
        room,
        property_types,
        property_subtypes,
        title,
        points,
        minimum_year_built,
        maximum_year_built,
        pool,
        minimum_lot_square_meters,
        maximum_lot_square_meters,
        listing_statuses,
        open_house,
        minimum_sold_date,
        mls_areas,
        list_agents,
        list_offices,
        counties,
        minimum_parking_spaces,
        architectural_styles,
        subdivisions,
        school_districts,
        primary_schools,
        middle_schools,
        elementary_schools,
        senior_high_schools,
        junior_high_schools,
        intermediate_schools,
        sort_order,
        sort_office,
        selling_agents,
        selling_offices,
        offices,
        agents,
        high_schools,
        excluded_listing_ids,
        postal_codes,
        pets,
        number_of_pets_allowed,
        application_fee,
        appliances,
        furnished,
        fenced_yard
    )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_SetSRID(ST_GeomFromText($12::text), 4326), $13, $14, $15, $16, $17, $18, $19, to_timestamp($20), $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49) RETURNING id;
