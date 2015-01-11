INSERT INTO
    listings(property_id,
             alerting_agent_id,
             listing_agent_id,
             listing_agency_id,
             currency,
             price,
             status)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7) RETURNING id
