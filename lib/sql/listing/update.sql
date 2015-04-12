UPDATE listings
SET alerting_agent_id = $1,
    listing_agent_id = $2,
    listing_agency_id = $3,
    currency = $4,
    price = $5,
    status = $6,
    original_price = $7,
    last_price = $8,
    low_price = $9,
    association_fee = $10
WHERE id = $11
