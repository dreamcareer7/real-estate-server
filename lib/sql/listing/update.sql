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
    association_fee = $10,
    association_fee_frequency = $11,
    association_fee_includes = $12,
    association_type = $13,
    unexempt_taxes = $14,
    updated_at = NOW()
WHERE id = $15
